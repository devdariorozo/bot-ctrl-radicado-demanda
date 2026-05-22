// Responsabilidad: traducir los mensajes de class-validator al español.

export function translateValidationMessage(msg: string): string {
  let m: RegExpMatchArray | null;

  m = msg.match(/^property (.+) should not exist$/);
  if (m) return `La propiedad '${m[1]}' no está permitida.`;

  m = msg.match(/^(.+) should not be empty$/);
  if (m) return `El campo '${m[1]}' no debe estar vacío.`;

  m = msg.match(/^(.+) must be a string$/);
  if (m) return `El campo '${m[1]}' debe ser texto.`;

  m = msg.match(/^(.+) must be a number conforming to the specified constraints$/);
  if (m) return `El campo '${m[1]}' debe ser un número válido.`;

  m = msg.match(/^(.+) must be an integer number$/);
  if (m) return `El campo '${m[1]}' debe ser un número entero.`;

  m = msg.match(/^(.+) must not be less than (.+)$/);
  if (m) return `El campo '${m[1]}' no debe ser menor a ${m[2]}.`;

  m = msg.match(/^(.+) must not be greater than (.+)$/);
  if (m) return `El campo '${m[1]}' no debe ser mayor a ${m[2]}.`;

  m = msg.match(/^(.+) must be a positive number$/);
  if (m) return `El campo '${m[1]}' debe ser un número positivo.`;

  m = msg.match(/^(.+) must be a negative number$/);
  if (m) return `El campo '${m[1]}' debe ser un número negativo.`;

  m = msg.match(/^(.+) must be a Date instance$/);
  if (m) return `El campo '${m[1]}' debe ser una fecha válida.`;

  m = msg.match(/^(.+) must be a boolean value$/);
  if (m) return `El campo '${m[1]}' debe ser verdadero o falso.`;

  m = msg.match(/^(.+) must be an email$/);
  if (m) return `El campo '${m[1]}' debe ser un correo electrónico válido.`;

  m = msg.match(/^(.+) must be a URL address$/);
  if (m) return `El campo '${m[1]}' debe ser una URL válida.`;

  m = msg.match(/^(.+) must be shorter than or equal to (\d+) characters$/);
  if (m) return `El campo '${m[1]}' no debe exceder ${m[2]} caracteres.`;

  m = msg.match(/^(.+) must be longer than or equal to (\d+) characters$/);
  if (m) return `El campo '${m[1]}' debe tener al menos ${m[2]} caracteres.`;

  m = msg.match(/^(.+) must be one of the following values: (.+)$/);
  if (m) return `El campo '${m[1]}' debe ser uno de estos valores: ${m[2]}.`;

  m = msg.match(/^each value in (.+) must be a string$/);
  if (m) return `Cada valor en '${m[1]}' debe ser texto.`;

  m = msg.match(/^each value in (.+) must be a number/);
  if (m) return `Cada valor en '${m[1]}' debe ser un número.`;

  m = msg.match(/^(.+) must be an array$/);
  if (m) return `El campo '${m[1]}' debe ser un arreglo.`;

  m = msg.match(/^(.+) must contain at least (\d+) elements?$/);
  if (m) return `El campo '${m[1]}' debe contener al menos ${m[2]} elemento(s).`;

  m = msg.match(/^(.+) must be a non-empty object$/);
  if (m) return `El campo '${m[1]}' debe ser un objeto no vacío.`;

  m = msg.match(/^(.+) must be an object$/);
  if (m) return `El campo '${m[1]}' debe ser un objeto.`;

  m = msg.match(/^(.+) must be a valid enum value$/);
  if (m) return `El campo '${m[1]}' tiene un valor no permitido.`;

  m = msg.match(/^(.+) should not be null or undefined$/);
  if (m) return `El campo '${m[1]}' es requerido.`;

  return msg;
}
