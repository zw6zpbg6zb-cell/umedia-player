
(function () {
    'use strict';

    var PLUGIN_ID = 'umedia_lampa_plugin';
    var PLUGIN_VERSION = '0.2.1';

    if (window[PLUGIN_ID]) return;
    window[PLUGIN_ID] = true;

    var BASE = 'https://umedia.click/';
    var MENU_URL = BASE + 'tv.xml';
    var initialized = false;

    var ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6v2h3v1H7v-1h3v-2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v10h16V7H4z"/></svg>';

    function notify(message) {
        try {
            if (Lampa.Noty) Lampa.Noty.show(message);
        } catch (e) {}
    }

    function openUmedia() {
        notify('Umedia: плагин запущен. Версия ' + PLUGIN_VERSION);
    }

    function init() {
        if (initialized) return;
        initialized = true;

        try {
            Lampa.SettingsApi.addComponent({
                component: 'umedia_settings',
                name: 'Umedia',
                icon: ICON
            });
        } catch (e) {
            console.log('[Umedia] Settings registration:', e);
        }

        try {
            Lampa.Menu.addButton(ICON, 'Umedia', openUmedia);
            console.log('[Umedia] Кнопка меню добавлена');
        } catch (e) {
            console.log('[Umedia] Menu error:', e);
            notify('Umedia: ошибка меню — ' + (e.message || e));
        }

        console.log('[Umedia] Запущен, версия ' + PLUGIN_VERSION);
    }

    function start() {
        if (window.appready) {
            init();
        } else if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') init();
            });
        } else {
            console.log('[Umedia] Ожидание запуска Lampa');
        }
    }

    try {
        start();
    } catch (e) {
        console.log('[Umedia] Ошибка запуска:', e);
    }
})();

