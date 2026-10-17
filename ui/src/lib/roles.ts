export const roleLabels: Record<string, string> = {
  management: 'Yönetim',
  reception: 'Resepsiyonist',
  accounting: 'Muhasebe',
  housekeeping: 'Kat hizmetleri',
  technical_service: 'Teknik servis',
  maintenance: 'Bakım',
  supervisor: 'Sorumlu',
  admin: 'Sistem yöneticisi',
};

export function roleLabel(role: string): string {
  return roleLabels[role === 'technical' ? 'technical_service' : role] || role;
}
