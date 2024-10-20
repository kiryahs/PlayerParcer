// popup.js

document.getElementById('clearStorage').addEventListener('click', () => {
    chrome.storage.local.remove('betIDs', function() {
        console.log('Сохранённые ID ставок очищены.');
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = 'Сохранённые ID очищены.';
        
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 3000);
    });
});
