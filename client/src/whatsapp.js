import { plainAmount } from './money.js';

export function reminderMessage(customer, shopName) {
  return `Namaste ${customer.name} ji, aapka Rs ${plainAmount(customer.balancePaise)} udhaar baaki hai. - ${shopName}`;
}

// opens WhatsApp with the message already typed; the shopkeeper only taps send
export function reminderLink(customer, shopName) {
  return `https://wa.me/91${customer.phone}?text=${encodeURIComponent(reminderMessage(customer, shopName))}`;
}
