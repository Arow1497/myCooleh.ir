const jalaliMoment = require("moment-jalali");

exports.function = function toPersianDate(gregorianDate) {
  return jalaliMoment(gregorianDate).format('jYYYY/jM/jD');
}

// مثال استفاده
const today = new Date();
const persianDate = toPersianDate(today);
console.log(persianDate); // خروجی به صورت تاریخ شمسی خواهد بود

exports.function = function toTehranTime(utcDate) {
    const tehranOffset = 210; // اختلاف زمانی تهران با UTC به دقیقه
    const tehranDate = new Date(utcDate.getTime() + tehranOffset * 60000);
    return tehranDate;
  }
  
  // مثال استفاده
  const utcNow = new Date();
  const tehranNow = toTehranTime(utcNow);
  console.log(tehranNow); // خروجی به صورت زمان تهران خواهد بود

  exports.function = function rialToToman(rialAmount) {
    return rialAmount / 10;
  }
  
  // مثال استفاده
  const rial = 100000;
  const toman = rialToToman(rial);
  console.log(toman); // خروجی: 10000

  exports.function = function formatPhoneNumber(phoneNumber) {
    // فرض کنید شماره تلفن به صورت 09123456789 وارد شده
    const match = phoneNumber.match(/^(\d{4})(\d{3})(\d{4})$/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`; // 0912 345 6789
    }
    return phoneNumber; // در صورت عدم تطابق، همان شماره را برگردانید
  }
  
  // مثال استفاده
  const phone = '09123456789';
  const formattedPhone = formatPhoneNumber(phone);
  console.log(formattedPhone);

  exports.function = function generateRandomCode(length) {
    let code = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return code;
  }
  
  // مثال استفاده
  const randomCode = generateRandomCode(6); // تولید کد 6 رقمی تصادفی
  console.log(randomCode);

  exports.function = function trimExtraSpaces(str) {
    return str.replace(/\s+/g, ' ').trim();
  }
  
  // مثال استفاده
  const string = '  This  string has   extra   spaces. ';
  const trimmedString = trimExtraSpaces(string);
  console.log(trimmedString); // خروجی: This string has extra spaces.

  exports.function = function toTitleCase(str) {
    return str.toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());
  }
  
  // مثال استفاده
  const sentence = 'hello world, this is a test.';
  const titleCaseSentence = toTitleCase(sentence);
  console.log(titleCaseSentence); // خروجی: Hello World, This Is A Test.

  exports.function = function getClientIp(req) {
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip.substr(0, 7) === "::ffff:") {
      ip = ip.substr(7);
    }
    return ip;
  }
  
  // مثال استفاده (در داخل یک route در Express):
  // app.get('/', (req, res) => {
  //   const ip = getClientIp(req);
  //   res.send(`Your IP address is: ${ip}`);
  // });

  exports.function = function sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  }
  
  // مثال استفاده
  const dirtyFilename = 'My File!@#$%^&*(.txt';
  const cleanFilename = sanitizeFilename(dirtyFilename);
  console.log(cleanFilename); // خروجی: My_File_______.txt

  exports.function = function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
  
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
    const i = Math.floor(Math.log(bytes) / Math.log(k));
  
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  // مثال استفاده
  const fileSize = 1234567;
  const formattedSize = formatBytes(fileSize);
  console.log(formattedSize); // خروجی: 1.18 MB (بسته به اعشار)

  exports.function = function slugify(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // مثال استفاده
  const title = 'This is a test title with spaces & special chars!';
  const slug = slugify(title);
  console.log(slug); // خروجی: this-is-a-test-title-with-spaces-special-chars

  exports.function = function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  
  // مثال استفاده:
  // const original = { a: 1, b: { c: 2 } };
  // const clone = deepClone(original);
