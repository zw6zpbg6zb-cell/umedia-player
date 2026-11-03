
(function () {
    'use strict';

    if (window.umedia_test_fixed) return;
    window.umedia_test_fixed = true;

    var icon = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6v2h3v1H7v-1h3v-2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v10h16V7H4z"/></svg>';

    function openUmedia() {
        Lampa.Noty.show('Umedia успешно запущен!');
    }

    function init() {
        if (window.umedia_button_added) return;

        if (!Lampa.Menu || !Lampa.Menu.addButton) {
            console.log('[Umedia] Menu API недоступен');
            return;
        }

        window.umedia_button_added = true;

        Lampa.Menu.addButton(icon, 'Umedia', openUmedia);

        console.log('[Umedia] Кнопка добавлена');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();
