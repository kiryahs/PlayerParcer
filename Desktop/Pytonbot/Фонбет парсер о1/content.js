// content.js

let isProcessing = false;
let historyClicked = false;

// Замените на ваш токен бота и chat_id
const TELEGRAM_BOT_TOKEN = '8161324627:AAEdBKEjzXbT4cQ89Xm608hRepbxZQ6whk4';
const TELEGRAM_CHAT_ID = '281941384';

/**
 * Имитация клика на элемент
 * @param {Element} elem - Элемент, по которому необходимо кликнуть
 */
function simulateClick(elem) {
    const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
    });
    elem.dispatchEvent(event);
    console.log('Имитирован клик по элементу:', elem);
}

/**
 * Отправка сообщения в Telegram
 * @param {string} message - Сообщение для отправки
 */
function sendToTelegram(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            console.log('Сообщение отправлено в Telegram');
        } else {
            console.error('Ошибка при отправке сообщения в Telegram:', data);
        }
    })
    .catch(error => {
        console.error('Ошибка при отправке запроса в Telegram:', error);
    });
}

/**
 * Сохранение новых ID ставок и отправка сообщений в Telegram
 * @param {Array} newBets - Массив новых ставок
 */
function saveNewBets(newBets) {
    if (newBets.length === 0) {
        console.log('Новых ставок для сохранения нет.');
        return;
    }

    // Получаем текущие сохраненные betIDs
    chrome.storage.local.get(['betIDs'], function(result) {
        let betIDs = result.betIDs || [];
        console.log('Текущие betIDs:', betIDs);

        let updated = false;

        newBets.forEach(bet => {
            if (!betIDs.includes(bet.betID)) {
                betIDs.push(bet.betID);
                updated = true;

                const message = `<b>Новая ставка:</b>
<b>Событие:</b> <a href="${bet.eventLink}">${bet.event}</a>
<b>Исход:</b> ${bet.outcome}
<b>КФ:</b> ${bet.coefficient}
<b>Сумма:</b> ${bet.amount}`;

                sendToTelegram(message);
                console.log('Сохранен новый ID ставки:', bet.betID);
            } else {
                console.log('ID ставки уже сохранен:', bet.betID);
            }
        });

        if (updated) {
            chrome.storage.local.set({ betIDs: betIDs }, function() {
                console.log('Обновлены betIDs в хранилище.');
            });
        } else {
            console.log('Нет новых ставок для сохранения.');
        }
    });
}

/**
 * Поиск и сохранение ID ставок
 */
function findBetIDs() {
    if (isProcessing) {
        console.log('findBetIDs уже выполняется, пропускаем вызов.');
        return;
    }

    isProcessing = true;
    console.log('Начало поиска ставок.');

    const copyButtons = document.querySelectorAll('span.clear-outline--Cqh52.button--cbAVc');
    console.log(`Найдено кнопок копирования: ${copyButtons.length}`);

    let foundBets = [];

    copyButtons.forEach((copyButton, index) => {
        const serverCouponDiv = copyButton.closest('div.server-coupon--j543d.coupon--JY4ny');
        if (!serverCouponDiv) {
            console.log(`Не найден родительский div.server-coupon--j543d для кнопки копирования (Элемент ${index + 1}), пропускаем.`);
            return;
        }

        const captionDiv = serverCouponDiv.querySelector('div.caption--d3wFo');
        if (!captionDiv) {
            console.log(`Не найден div.caption--d3wFo внутри div.server-coupon--j543d (Элемент ${index + 1}), пропускаем.`);
            return;
        }

        const betText = captionDiv.textContent;
        const betIDMatch = betText.match(/#\s*(\d+)/);
        if (betIDMatch && betIDMatch[1]) {
            const betID = betIDMatch[1];
            console.log(`Найден ID ставки: ${betID}`);

            // Извлечение информации о событии
            const eventLinkElement = serverCouponDiv.querySelector('a.clear-outline--Cqh52.link--_zGNa');
            const event = eventLinkElement ? eventLinkElement.textContent.trim() : 'Неизвестно';
            const eventHref = eventLinkElement ? eventLinkElement.getAttribute('href') : '';
            const eventLink = eventHref ? new URL(eventHref, window.location.origin).href : 'Неизвестно';

            // Извлечение исхода
            let outcome = 'Неизвестно';
            // Попробуем найти элемент по другим критериям, если текущий селектор не работает
            const possibleOutcomeSelectors = [
                'td.column--nHm20._type_stake--ByL0S',
                'td[data-type="stake"]',
                'td.stake-column',
                'td.outcome'
            ];
            for (let selector of possibleOutcomeSelectors) {
                const outcomeTd = serverCouponDiv.querySelector(selector);
                if (outcomeTd && outcomeTd.textContent.trim()) {
                    outcome = outcomeTd.textContent.trim();
                    break;
                }
            }
            if (outcome === 'Неизвестно') {
                console.warn(`Не удалось найти "Исход" для ставки ID: ${betID}`);
            }

            // Извлечение коэффициента
            let coefficient = 'Неизвестно';
            const possibleCoefficientSelectors = [
                'td.column--nHm20._type_factor--eVPY3',
                'td[data-type="factor"]',
                'td.factor-column',
                'td.coefficient'
            ];
            for (let selector of possibleCoefficientSelectors) {
                const coefficientTd = serverCouponDiv.querySelector(selector);
                if (coefficientTd && coefficientTd.textContent.trim()) {
                    coefficient = coefficientTd.textContent.trim();
                    break;
                }
            }
            if (coefficient === 'Неизвестно') {
                console.warn(`Не удалось найти "КФ" для ставки ID: ${betID}`);
            }

            // Извлечение суммы
            const amountSpan = serverCouponDiv.querySelector('div.info--X_Z93 div.left--QzRq8 div.item--qIAn_ span[resource-name="wallet"] + span');
            const amount = amountSpan ? amountSpan.textContent.trim() : 'Неизвестно';

            foundBets.push({
                betID: betID,
                event: event,
                eventLink: eventLink,
                outcome: outcome,
                coefficient: coefficient,
                amount: amount
            });
        } else {
            console.log(`ID ставки не найден: ${betText}`);
        }
    });

    console.log(`Найдено ставок для обработки: ${foundBets.length}`);

    if (foundBets.length > 0) {
        saveNewBets(foundBets);
    }

    isProcessing = false;
    console.log('Поиск ставок завершён.');
}

/**
 * Нажатие на кнопку "История"
 */
function clickHistoryButton() {
    if (historyClicked) return;

    const historyButton = Array.from(document.querySelectorAll('span.clear-outline--Cqh52.mode--xkbLp'))
        .find(elem => elem.textContent.trim().startsWith('История'));

    if (historyButton && !isProcessing) {
        historyClicked = true;
        console.log('Кнопка "История" найдена:', historyButton);
        simulateClick(historyButton);
        setTimeout(findBetIDs, 5000);
    } else {
        console.log('Кнопка "История" не найдена или уже нажата, продолжаем поиск...');
        setTimeout(clickHistoryButton, 300);
    }
}

/**
 * Запуск периодической проверки новых ставок
 */
function startPeriodicCheck() {
    setInterval(findBetIDs, 5000); // Каждые 5 секунд
}

/**
 * Запуск скрипта
 */
function main() {
    console.log('Расширение запущено.');
    clickHistoryButton();
    startPeriodicCheck();
}

window.addEventListener('load', main);
