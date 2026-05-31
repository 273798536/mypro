import {
  getContracts,
  getContractById,
  createContract,
  getGuaranteesByContractId,
  getRepaymentRecordsByContractId,
  type Contract,
  type Guarantee,
  type RepaymentRecord,
} from '../repositories/contract.js'

export interface ContractDetail {
  contract: Contract
  guarantees: Guarantee[]
  repayment_records: RepaymentRecord[]
}

export function listContracts(): Contract[] {
  return getContracts()
}

export function getContractDetail(id: string): ContractDetail | null {
  const contract = getContractById(id)
  if (!contract) return null
  const guarantees = getGuaranteesByContractId(id)
  const repayment_records = getRepaymentRecordsByContractId(id)
  return { contract, guarantees, repayment_records }
}

export function createNewContract(data: Omit<Contract, 'id' | 'created_at'>): Contract {
  return createContract(data)
}
