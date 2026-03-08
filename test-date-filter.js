// Test dagens datum (7 mars 2026 är lördag)
const currentDate = new Date('2026-03-07T10:00:00');
const day = currentDate.getDay();
console.log('Idag:', currentDate.toLocaleDateString('sv-SE'), '(veckodag', day, ')');

// Beräkna måndagen för denna vecka
const diff = day === 0 ? -6 : 1 - day;
const monday = new Date(currentDate);
monday.setDate(currentDate.getDate() + diff);
monday.setHours(0, 0, 0, 0);
console.log('Veckans måndag:', monday.toLocaleDateString('sv-SE'));

// Vecka 0 (denna vecka)
const weekStart = new Date(monday);
weekStart.setDate(weekStart.getDate() + (0 * 7));
weekStart.setHours(0, 0, 0, 0);

const weekEnd = new Date(weekStart);
weekEnd.setDate(weekEnd.getDate() + 6);
weekEnd.setHours(23, 59, 59, 999);

console.log('\nVecka 0:');
console.log('  Start:', weekStart.toLocaleDateString('sv-SE'), weekStart.toTimeString());
console.log('  Slut:', weekEnd.toLocaleDateString('sv-SE'), weekEnd.toTimeString());

// Testa olika måltidsdatum
const testDates = ['2026-03-02', '2026-03-03', '2026-03-04'];

testDates.forEach(dateStr => {
    const mealDate = new Date(dateStr);
    mealDate.setHours(12, 0, 0, 0);
    const inRange = mealDate.getTime() >= weekStart.getTime() && mealDate.getTime() <= weekEnd.getTime();
    console.log(`\n${dateStr} (${mealDate.toLocaleDateString('sv-SE')}): ${inRange ? '✅ INKLUDERAD' : '❌ EXKLUDERAD'}`);
    console.log(`  mealDate: ${mealDate.getTime()}`);
    console.log(`  weekStart: ${weekStart.getTime()}`);
    console.log(`  weekEnd: ${weekEnd.getTime()}`);
});
