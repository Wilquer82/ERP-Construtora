import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';
import bcrypt from 'bcryptjs';

const funcionarioSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  cpf: { type: String, required: true, trim: true, select: false },
  dataNascimento: Date,
  telefone: String,
  email: { type: String, lowercase: true, trim: true },
  cargo: String,
  senha: { type: String, required: true, select: false },
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

funcionarioSchema.index({ empresa: 1, cpf: 1 }, { unique: true });
funcionarioSchema.plugin(tenantPlugin);

funcionarioSchema.pre('save', async function (next) {
  if (!this.isModified('senha')) return next();
  const salt = await bcrypt.genSalt(10);
  this.senha = await bcrypt.hash(this.senha, salt);
  next();
});

funcionarioSchema.methods.compararSenha = function (senhaDigitada) {
  return bcrypt.compare(senhaDigitada, this.senha);
};

export const Funcionario = mongoose.model('Funcionario', funcionarioSchema);