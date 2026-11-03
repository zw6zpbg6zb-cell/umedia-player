
(function () {
    'use strict';

    var FLAG = 'umedia_menu_event_v040';
    if (window[FLAG]) return;
    window[FLAG] = true;

    var ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6v2h3v1H7v-1h3v-2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v10h16V7H4z"/></svg>';

    function addToMenu(menu) {
        if (!menu || !menu.length) return;

        var list = menu.find('.menu__list').eq(0);

        if (!list.length) {
            console.log('[Umedia] Список меню не найден');
            return;
        }

        if (list.find('.umedia-menu-item').length) return;

        var button = $(
            '<li class="menu__item selector umedia-menu-item">' +
                '<div class="menu__ico">' + ICON + '</div>' +
                '<div class="menu__text">Umedia</div>' +
            '</li>'
        );

        button.on('hover:enter', function () {
            Lampa.Noty.show('Umedia: пункт меню работает');
        });

        list.append(button);

        console.log('[Umedia] Пункт добавлен через событие menu');
    }

    function init() {
        // Подписываемся на создание меню
        Lampa.Listener.follow('menu', function (event) {
            if (event.type === 'start' && event.body) {
                addToMenu(event.body);
            }
        });

        // Если меню уже создано к моменту загрузки плагина
        if (window.appready) {
            addToMenu($('.menu'));
        } else {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') {
                    addToMenu($('.menu'));
                }
            });
        }

        console.log('[Umedia] Версия 0.4.0 загружена');
    }

    try {
        init();
    } catch (error) {
        console.error('[Umedia] Ошибка:', error);
    }
})();
