const autoBind = require("auto-bind");

module.exports = class Controller{
    constructor(){
        autoBind(this)
    }
    testMethod(){
        return "Test String"
    }
}

/*
یک کلاس عمومی سرویس مثل کلاس عمومی کنترلر ... بقیه سرویس ها از این کلاس ارث بری
میکنند... یک چیز خیلی مهم اینه که میتونی به کلاس عمومی کنترلر یا سرویس 
ویژگی هایی اضافه کنی و دیگه تو کل کنترلر ها مجبور نباشی تکرارش کنی راجب
 این موضوع حتمابخون

 */