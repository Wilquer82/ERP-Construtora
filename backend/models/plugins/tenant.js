import mongoose from 'mongoose';
import { currentTenant } from '../../middleware/tenantContext.js';

const scopedOperations = [
  'countDocuments',
  'deleteMany',
  'deleteOne',
  'distinct',
  'find',
  'findOne',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'replaceOne',
  'updateMany',
  'updateOne'
];

function referencedPaths(schema, prefix = '') {
  const references = [];
  schema.eachPath((path, pathType) => {
    const fullPath = prefix ? `${prefix}.${path}` : path;
    if (pathType.options?.ref) {
      if (!['empresa', 'criadoPor', 'alteradoPor'].includes(fullPath)) {
        references.push({ path: fullPath, ref: pathType.options.ref });
      }
      return;
    }
    if (pathType.schema) references.push(...referencedPaths(pathType.schema, fullPath));
  });
  return references;
}

function valuesAtPath(value, parts) {
  if (value == null) return [];
  if (!parts.length) return Array.isArray(value) ? value.flatMap((item) => valuesAtPath(item, [])) : [value];
  if (Array.isArray(value)) return value.flatMap((item) => valuesAtPath(item, parts));
  const [part, ...remaining] = parts;
  const nextValue = typeof value?.get === 'function' ? value.get(part) : value?.[part];
  return valuesAtPath(nextValue, remaining);
}

function updateValues(update, path) {
  const candidates = [];
  if (Array.isArray(update)) {
    for (const stage of update) {
      if (stage.$set && Object.hasOwn(stage.$set, path.split('.')[0])) candidates.push(stage.$set);
    }
  } else {
    for (const [operator, value] of Object.entries(update || {})) {
      if (operator.startsWith('$') && value && Object.hasOwn(value, path.split('.')[0])) {
        candidates.push(value);
      }
    }
    if (!Object.keys(update || {}).some((key) => key.startsWith('$'))) candidates.push(update);
  }
  return candidates.flatMap((candidate) => valuesAtPath(candidate, path.split('.')));
}

export default function tenantPlugin(schema) {
  schema.add({
    empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
      index: true
    },
    criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    alteradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  });

  schema.pre('validate', async function () {
    const context = currentTenant();
    if (!context?.empresaId) return;

    if (!context.bypass && this.empresa && String(this.empresa) !== String(context.empresaId)) {
      this.invalidate('empresa', 'Empresa do documento nao corresponde ao contexto autenticado');
    }
    this.empresa = context.empresaId;
    if (!this.criadoPor && context.userId) this.criadoPor = context.userId;
    if (context.userId) this.alteradoPor = context.userId;

    if (context.bypass) return;
    for (const { path, ref } of referencedPaths(schema)) {
      const values = valuesAtPath(this, path.split('.'));
      const ids = values
        .filter((value) => value && value !== '')
        .map((value) => String(value?._id || value));
      for (const id of new Set(ids)) {
        if (!mongoose.isValidObjectId(id)) {
          this.invalidate(path, 'Referencia invalida');
          continue;
        }
        const referenceQuery = mongoose.model(ref).exists({ _id: id, empresa: context.empresaId });
        const session = this.$session?.();
        if (session) referenceQuery.session(session);
        const exists = await referenceQuery;
        if (!exists) this.invalidate(path, 'Referencia inexistente para esta empresa');
      }
    }
  });

  for (const operation of scopedOperations) {
    schema.pre(operation, async function () {
      const context = currentTenant();
      if (!context || context.bypass) return;
      if (!context.empresaId) {
        throw new Error('Contexto de empresa ausente');
      }

      this.where({ empresa: context.empresaId });
      if (['findOneAndUpdate', 'findOneAndReplace', 'updateMany', 'updateOne', 'replaceOne'].includes(operation)) {
        const update = this.getUpdate() || {};
        for (const { path, ref } of referencedPaths(schema)) {
          for (const value of updateValues(update, path)) {
            const id = String(value?._id || value);
            if (!mongoose.isValidObjectId(id)) {
              const error = new Error('Referencia invalida');
              error.status = 400;
              throw error;
            }
            const referenceQuery = mongoose.model(ref).exists({ _id: id, empresa: context.empresaId });
            const session = this.getOptions().session;
            if (session) referenceQuery.session(session);
            const exists = await referenceQuery;
            if (!exists) {
              const error = new Error('Referencia inexistente para esta empresa');
              error.status = 400;
              throw error;
            }
          }
        }
        if (Array.isArray(update)) {
          this.setUpdate([
            ...update,
            { $set: { empresa: context.empresaId, ...(context.userId ? { alteradoPor: context.userId } : {}) } }
          ]);
        } else if (operation === 'replaceOne' || operation === 'findOneAndReplace') {
          this.setUpdate({
            ...update,
            empresa: context.empresaId,
            ...(context.userId ? { alteradoPor: context.userId } : {})
          });
        } else {
          const set = { ...(update.$set || {}), empresa: context.empresaId };
          if (context.userId) set.alteradoPor = context.userId;
          const setOnInsert = { ...(update.$setOnInsert || {}) };
          if (context.userId) setOnInsert.criadoPor = context.userId;
          this.setUpdate({
            ...update,
            $set: set,
            ...(Object.keys(setOnInsert).length ? { $setOnInsert: setOnInsert } : {})
          });
        }
      }
    });
  }

  schema.pre('aggregate', function () {
    const context = currentTenant();
    if (!context || context.bypass) return;
    if (!context.empresaId) throw new Error('Contexto de empresa ausente');
    this.pipeline().unshift({ $match: { empresa: context.empresaId } });
  });
}
