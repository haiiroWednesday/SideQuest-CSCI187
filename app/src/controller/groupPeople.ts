// CONTROLLER: how a person in a group is named and coloured. No sample data, no storage.
export const YOU = 'You'
const COLORS = ['#b8741f', '#5f6f30', '#3f5f7f', '#7a2e5a', '#a24a2c', '#3f6f66']
export const personColor = (n: string) => n === YOU ? '#a32035' : COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
