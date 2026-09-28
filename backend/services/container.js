import { MongoGridFSAdapter } from './storage/MongoGridFSAdapter.js';
import { AssinaturaSimplesAdapter } from './assinatura/AssinaturaSimplesAdapter.js';
import { Funcionario } from '../models/Funcionario.js';

let storage;
if (process.env.STORAGE_ADAPTER === 'r2') {
  throw new Error('R2 ainda nao implementado — use STORAGE_ADAPTER=mongo');
} else {
  storage = new MongoGridFSAdapter();
}

const buscarFuncionarioPorCpf = (cpf) =>
  Funcionario.findOne({ cpf }).select('+senha');

let assinatura;
if (process.env.ASSINATURA_ADAPTER === 'd4sign') {
  throw new Error('D4Sign ainda nao implementado — use ASSINATURA_ADAPTER=simples');
} else {
  assinatura = new AssinaturaSimplesAdapter(storage, buscarFuncionarioPorCpf);
}

export const services = { storage, assinatura };