document.getElementById('scrapeButton').addEventListener('click', () => {
    const nickname = document.getElementById('nickname').value.trim();
    const startDate = document.getElementById('startDate').value.trim();
    const endDate = document.getElementById('endDate').value.trim();
    const status = document.getElementById('status');

    if (!nickname || !startDate || !endDate) {
        status.textContent = "Пожалуйста, заполните все поля.";
        return;
    }

    status.textContent = "Сбор данных...";

    // Отправка сообщения content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { nickname, startDate, endDate }, (response) => {
            if (response && response.success) {
                status.textContent = "Данные успешно собраны!";
                downloadCSV(response.data);
            } else {
                status.textContent = "Произошла ошибка при сборе данных.";
            }
        });
    });
});

// Функция для скачивания CSV файла
function downloadCSV(data) {
    const csvHeader = Object.keys(data[0]).join(",") + "\n";
    const csvRows = data.map(row => Object.values(row).map(v => `"${v}"`).join(",")).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + csvHeader + csvRows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "matches.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
