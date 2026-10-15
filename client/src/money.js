// amounts are stored in paise (integers); these helpers show them as rupees
export function formatMoney(paise) {
  const rupees = Math.abs(paise) / 100;
  const whole = Number.isInteger(rupees);
  return (
    '₹' +
    rupees.toLocaleString('en-IN', {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

// same amount without the rupee sign, used inside the WhatsApp message
export function plainAmount(paise) {
  return formatMoney(paise).replace('₹', '');
}
