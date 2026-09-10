/* Cắt riêng màn hình LCD của giả lập cho dễ nhìn. */
import sharp from 'sharp';
const ten = process.argv[2];
await sharp(`scratch/casio/${ten}.png`)
  .extract({ left: 28, top: 180, width: 282, height: 100 })
  .resize({ width: 846 }).png().toFile(`scratch/casio/${ten}-lcd.png`);
console.log('ok', ten);
