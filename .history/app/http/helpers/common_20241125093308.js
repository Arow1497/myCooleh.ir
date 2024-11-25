const jalaliMoment = require("moment-jalali");

  /*/////////////////////////////////////////////////////////
  *
  ** 1. تبدیل تاریخ میلادی به شمسی (using a library like jalali-moment):
  **///////////////////////////////////////////////////////////
exports.function = function toPersianDate(gregorianDate) {
  return jalaliMoment(gregorianDate).format('jYYYY/jM/jD');
}

// مثال استفاده
const today = new Date();
const persianDate = toPersianDate(today);
console.log(persianDate); // خروجی به صورت تاریخ شمسی خواهد بود

  /*/////////////////////////////////////////////////////////
  *
  ** 2. تبدیل ساعت جهانی (UTC) به تهران:
  **///////////////////////////////////////////////////////////
exports.function = function toTehranTime(utcDate) {
    const tehranOffset = 210; // اختلاف زمانی تهران با UTC به دقیقه
    const tehranDate = new Date(utcDate.getTime() + tehranOffset * 60000);
    return tehranDate;
  }
  
  // مثال استفاده
  const utcNow = new Date();
  const tehranNow = toTehranTime(utcNow);
  console.log(tehranNow); // خروجی به صورت زمان تهران خواهد بود

  /*/////////////////////////////////////////////////////////
  *
  ** 3. تبدیل ریال به تومان:
  **///////////////////////////////////////////////////////////
  exports.function = function rialToToman(rialAmount) {
    return rialAmount / 10;
  }
  
  // مثال استفاده
  const rial = 100000;
  const toman = rialToToman(rial);
  console.log(toman); // خروجی: 10000

  /*/////////////////////////////////////////////////////////
  *
  ** 4. فرمت کردن شماره تلفن:
  **///////////////////////////////////////////////////////////
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

  /*/////////////////////////////////////////////////////////
  *
  ** 5. تولید کد تصادفی:
  **///////////////////////////////////////////////////////////
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

  /*/////////////////////////////////////////////////////////
  *
  ** 6. حذف فاصله های اضافی از رشته:
  **///////////////////////////////////////////////////////////
  exports.function = function trimExtraSpaces(str) {
    return str.replace(/\s+/g, ' ').trim();
  }
  
  // مثال استفاده
  const string = '  This  string has   extra   spaces. ';
  const trimmedString = trimExtraSpaces(string);
  console.log(trimmedString); // خروجی: This string has extra spaces.

  /*/////////////////////////////////////////////////////////
  *
  ** 7. تبدیل اولین حرف هر کلمه به حروف بزرگ (Title Case):
  **///////////////////////////////////////////////////////////
  exports.function = function toTitleCase(str) {
    return str.toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());
  }
  
  // مثال استفاده
  const sentence = 'hello world, this is a test.';
  const titleCaseSentence = toTitleCase(sentence);
  console.log(titleCaseSentence); // خروجی: Hello World, This Is A Test.

  /*/////////////////////////////////////////////////////////
  *
  ** 8. گرفتن آدرس IP کاربر:
  **///////////////////////////////////////////////////////////
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

  /*/////////////////////////////////////////////////////////
  *
  ** 9. حذف کاراکترهای غیرمجاز از نام فایل:
  **///////////////////////////////////////////////////////////
  exports.function = function sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  }
  
  // مثال استفاده
  const dirtyFilename = 'My File!@#$%^&*(.txt';
  const cleanFilename = sanitizeFilename(dirtyFilename);
  console.log(cleanFilename); // خروجی: My_File_______.txt

  /*/////////////////////////////////////////////////////////
  *
  ** 10. تبدیل حجم فایل به واحد قابل خواندن (مثلاً KB، MB):
  **///////////////////////////////////////////////////////////
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

  /*/////////////////////////////////////////////////////////
  *
  ** 11. ایجاد یک slug (URL friendly string) از یک رشته:
  **///////////////////////////////////////////////////////////
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

  /*/////////////////////////////////////////////////////////
  *
  ** 12. کپی عمیق یک آبجکت یا آرایه:
  **///////////////////////////////////////////////////////////
  exports.function = function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  
  // مثال استفاده:
  // const original = { a: 1, b: { c: 2 } };
  // const clone = deepClone(original);

  /*/////////////////////////////////////////////////////////
  *
  ** 13. محدود کردن اجرای یک تابع (Throttling):
  **///////////////////////////////////////////////////////////
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }
  
  // مثال استفاده:
  // const myThrottledFunction = throttle(() => console.log('Throttled!'), 1000);

  /*/////////////////////////////////////////////////////////
  *
  ** 14. دریافت پسوند فایل:
  **///////////////////////////////////////////////////////////
  function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
  }
  
  // مثال استفاده:
  // const fileName = 'image.jpg';
  // const extension = getFileExtension(fileName); // jpg

  /*/////////////////////////////////////////////////////////
  *
  ** 15. تبدیل یک رشته به فرمت Camel Case:
  **///////////////////////////////////////////////////////////
  function toCamelCase(str) {
    return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
  }
  
  // مثال استفاده:
  // const snakeCase = 'user_name';
  // const camelCase = toCamelCase(snakeCase); // userName

  /*/////////////////////////////////////////////////////////
  *
  ** 16. ایجاد یک UUID منحصر به فرد:
  **///////////////////////////////////////////////////////////
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // مثال استفاده:
  // const uniqueId = generateUUID();
///////////////////////////////////////////////////////////////