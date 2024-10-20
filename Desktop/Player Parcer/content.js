chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { nickname, startDate, endDate } = request;

    // Функция для преобразования даты в объект Date
    function parseDate(dateStr) {
        const [day, month, year] = dateStr.split('.').map(Number);
        return new Date(year, month - 1, day);
    }

    // Генерация списка дат
    function generateDateList(start, end) {
        const startDate = parseDate(start);
        const endDate = parseDate(end);
        const dateList = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const day = String(currentDate.getDate()).padStart(2, '0');
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const year = currentDate.getFullYear();
            dateList.push(`${day}.${month}.${year}`);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dateList;
    }

    // Функция ожидания элемента
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                return resolve(element);
            }

            const observer = new MutationObserver((mutations) => {
                const elem = document.querySelector(selector);
                if (elem) {
                    resolve(elem);
                    observer.disconnect();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error("Timeout waiting for element " + selector));
            }, timeout);
        });
    }

    // Основная функция сбора данных
    async function scrapeData(nickname, start, end) {
        const dates = generateDateList(start, end);
        const results = [];

        for (const date of dates) {
            try {
                // Ввод никнейма в поле поиска
                const searchInput = await waitForElement("input.search-panel__input--xW3P5");
                searchInput.value = nickname;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

                // Ожидание загрузки результатов
                await waitForElement("div.match-item", 10000); // Замените 'match-item' на реальный класс

                // Ввод даты
                const dateInput = await waitForElement("input.input--K8eyY[data-testid='datePicker']");
                dateInput.value = date;
                dateInput.dispatchEvent(new Event('input', { bubbles: true }));
                dateInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

                // Ожидание загрузки результатов по дате
                await waitForElement("div.match-item", 10000); // Замените 'match-item' на реальный класс

                // Парсинг данных о матчах
                const matches = document.querySelectorAll('div.match-item'); // Замените 'match-item' на реальный класс
                matches.forEach(matchDiv => {
                    try {
                        const playerA = matchDiv.querySelector('span.player-a').innerText.trim();
                        const playerB = matchDiv.querySelector('span.player-b').innerText.trim();
                        const goalsA = parseInt(matchDiv.querySelector('span.goals-a').innerText.trim());
                        const goalsB = parseInt(matchDiv.querySelector('span.goals-b').innerText.trim());
                        const result = matchDiv.querySelector('span.result').innerText.trim();

                        results.push({
                            "Player A": playerA,
                            "Player B": playerB,
                            "Goals A": goalsA,
                            "Goals B": goalsB,
                            "Result": result,
                            "Date": date
                        });
                    } catch (error) {
                        console.error("Ошибка при парсинге матча:", error);
                    }
                });

                // Добавление задержки между запросами
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error("Ошибка при обработке даты:", date, error);
            }
        }

        return results;
    }

    // Выполнение скрапинга
    scrapeData(nickname, startDate, endDate).then(data => {
        sendResponse({ success: true, data });
    }).catch(error => {
        console.error("Ошибка при сборе данных:", error);
        sendResponse({ success: false });
    });

    // Возвращаем true, чтобы держать канал открытым для асинхронного ответа
    return true;
});
