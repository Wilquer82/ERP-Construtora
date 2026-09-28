import mongoose from 'mongoose';
import tenantPlugin from './plugins/tenant.js';

const passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  usado: { type: Boolean, default: false }
}, { timestamps: true });

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
passwordResetSchema.index({ tokenHash: 1 }, { unique: true });
passwordResetSchema.plugin(tenantPlugin);

export default mongoose.model('PasswordReset', passwordResetSchema);
