export type MaritalStatus = 'Single' | 'Married' | 'DomesticPartnership' | 'Divorced' | 'Widowed'

export type PersonRole = 'Self' | 'Spouse' | 'Child' | 'Other'

export type AssetCategory =
  | 'RealEstate'
  | 'BankAccount'
  | 'Investment'
  | 'Retirement'
  | 'LifeInsurance'
  | 'Business'
  | 'Vehicle'
  | 'PersonalProperty'
  | 'DigitalAsset'
  | 'Other'
  | 'Debt'

export type BeneficiaryStatus = 'NotApplicable' | 'None' | 'Designated' | 'NeedsReview'

export interface Household {
  id: string
  name: string
  stateCode: string
  maritalStatus: MaritalStatus
  createdAt: string
}

export interface Person {
  id: string
  firstName: string
  lastName: string
  role: PersonRole
  dateOfBirth: string | null
}

export type ProbateStatus =
  | 'NotApplicable'
  | 'AvoidsProbateTrust'
  | 'AvoidsProbateBeneficiary'
  | 'LikelyProbate'

export interface Asset {
  id: string
  name: string
  category: AssetCategory
  estimatedValue: number
  ownerPersonId: string | null
  beneficiaryStatus: BeneficiaryStatus
  beneficiaryName: string | null
  heldInTrust: boolean
  probateStatus: ProbateStatus
  notes: string | null
}

export interface ReadinessItem {
  key: string
  label: string
  done: boolean
  detail: string
}

export interface Dashboard {
  totalAssets: number
  totalDebts: number
  netEstate: number
  peopleCount: number
  assetCount: number
  hasMinorChildren: boolean
  readinessScore: number
  checklist: ReadinessItem[]
  probateExposedValue: number
}

export type WillStatus = 'Draft' | 'Complete' | 'Executed'

export type ResiduaryStrategy = 'SpouseThenChildren' | 'ChildrenEqually' | 'Custom'

export interface WillGift {
  description: string
  recipientPersonId: string | null
  recipientName: string | null
}

export interface ResiduaryShare {
  personId: string | null
  name: string | null
  percent: number
}

export interface WillPlan {
  id: string
  testatorPersonId: string | null
  executorPersonId: string | null
  backupExecutorPersonId: string | null
  waiveExecutorBond: boolean
  guardianPersonId: string | null
  backupGuardianPersonId: string | null
  residuaryStrategy: ResiduaryStrategy
  gifts: WillGift[]
  residuaryShares: ResiduaryShare[]
  status: WillStatus
  executedOn: string | null
  witness1Name: string | null
  witness2Name: string | null
  storageLocation: string | null
  stateSupported: boolean
  updatedAt: string
}

export type WillPlanInput = Omit<
  WillPlan,
  'id' | 'status' | 'executedOn' | 'witness1Name' | 'witness2Name' | 'storageLocation' | 'stateSupported' | 'updatedAt'
>

export interface MarkExecutedInput {
  executedOn: string
  witness1Name: string
  witness2Name: string
  storageLocation: string
}

export interface DocumentArticle {
  heading: string
  paragraphs: string[]
}

export interface WillDocument {
  title: string
  testatorName: string
  isDraft: boolean
  articles: DocumentArticle[]
  execution: {
    stateCode: string
    witnessCount: number
    steps: string[]
    warnings: string[]
  }
  beneficiaryConflictNotes: string[]
  disclosure: string
}

export type EstateDocumentType = 'FinancialPoa' | 'HealthcareDirective'

export type DocumentStatus = 'Draft' | 'Complete' | 'Executed'

export type LifeSupportPreference = 'NotChosen' | 'ProlongLife' | 'DoNotProlong' | 'AgentDecides'

export interface EstateDocument {
  id: string
  type: EstateDocumentType
  principalPersonId: string | null
  agentPersonId: string | null
  backupAgentPersonId: string | null
  effectiveImmediately: boolean
  lifeSupport: LifeSupportPreference
  includeHipaa: boolean
  organDonation: boolean
  status: DocumentStatus
  executedOn: string | null
  executionNotes: string | null
  updatedAt: string
}

export type EstateDocumentInput = Omit<
  EstateDocument,
  'id' | 'type' | 'status' | 'executedOn' | 'executionNotes' | 'updatedAt'
>

export interface TrustPlan {
  id: string
  grantorPersonId: string | null
  successorTrusteePersonId: string | null
  backupTrusteePersonId: string | null
  distributionStrategy: ResiduaryStrategy
  distributionShares: ResiduaryShare[]
  status: DocumentStatus
  executedOn: string | null
  executionNotes: string | null
  fundedAssetCount: number
  fundableAssetCount: number
  updatedAt: string
}

export type TrustPlanInput = Pick<
  TrustPlan,
  | 'grantorPersonId'
  | 'successorTrusteePersonId'
  | 'backupTrusteePersonId'
  | 'distributionStrategy'
  | 'distributionShares'
>

export type VaultItemCategory =
  | 'PropertyDeed'
  | 'InsurancePolicy'
  | 'PasswordManager'
  | 'DigitalAccount'
  | 'FuneralWishes'
  | 'Letter'
  | 'Other'

export interface VaultItem {
  id: string
  name: string
  category: VaultItemCategory
  location: string | null
  notes: string | null
  updatedAt: string
}

export interface VaultSummary {
  documents: {
    key: string
    title: string
    status: string
    executedOn: string | null
    storageLocation: string | null
  }[]
  items: VaultItem[]
}

export const VAULT_CATEGORY_LABELS: Record<VaultItemCategory, string> = {
  PropertyDeed: 'Property deed',
  InsurancePolicy: 'Insurance policy',
  PasswordManager: 'Password manager',
  DigitalAccount: 'Digital account',
  FuneralWishes: 'Funeral wishes',
  Letter: 'Letter to loved ones',
  Other: 'Other',
}

export const PROBATE_LABELS: Record<ProbateStatus, string> = {
  NotApplicable: '—',
  AvoidsProbateTrust: 'Skips probate (in trust)',
  AvoidsProbateBeneficiary: 'Skips probate (beneficiary)',
  LikelyProbate: 'Goes through probate',
}

export function isMinor(person: Person, today = new Date()): boolean {
  if (person.role !== 'Child') return false
  if (!person.dateOfBirth) return true
  const dob = new Date(person.dateOfBirth)
  const age =
    today.getFullYear() -
    dob.getFullYear() -
    (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0)
  return age < 18
}

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  RealEstate: 'Real estate',
  BankAccount: 'Bank account',
  Investment: 'Investment account',
  Retirement: 'Retirement account',
  LifeInsurance: 'Life insurance',
  Business: 'Business interest',
  Vehicle: 'Vehicle',
  PersonalProperty: 'Personal property',
  DigitalAsset: 'Digital asset',
  Other: 'Other',
  Debt: 'Debt / liability',
}

export const DESIGNATABLE_CATEGORIES: AssetCategory[] = [
  'BankAccount',
  'Investment',
  'Retirement',
  'LifeInsurance',
]

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  Self: 'Me',
  Spouse: 'Spouse / partner',
  Child: 'Child',
  Other: 'Other loved one',
}

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  Single: 'Single',
  Married: 'Married',
  DomesticPartnership: 'Domestic partnership',
  Divorced: 'Divorced',
  Widowed: 'Widowed',
}

export const US_STATES: [string, string][] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
  ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
]
