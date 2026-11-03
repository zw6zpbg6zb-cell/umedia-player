
(function () {
    'use strict';

    var FLAG = 'umedia_sidebar_plugin_v1';
    if (window[FLAG]) return;
    window[FLAG] = true;

    var ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6v2h3v1H7v-1h3v-2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v10h16V7H4z"/></svg>';

    function openUmedia() {
        if (window.Lampa && Lampa.Noty) {
            Lampa.Noty.show('Umedia: кнопка работает');
        }
    }

    function addButton() {
        var list = $('.menu .menu__list').eq(0);

        if (!list.length) {
            console.log('[Umedia] Боковое меню пока не создано');
            return false;
        }

        if (list.find('.umedia-sidebar-button').length) return true;

        var button = $('<li class="menu__item selector umedia-sidebar-button">' +
            '<div class="menu__ico">' + ICON + '</div>' +
            '<div class="menu__text">Umedia</div>' +
            '</li>');

        button.on('hover:enter', openUmedia);
        list.append(button);

        console.log('[Umedia] Пункт добавлен в боковое меню');
        return true;
    }

    function init() {
        if (addButton()) return;

        if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('menu', function (event) {
                if (event.type === 'end') addButton();
            });

            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') addButton();
            });
        }
    }

    if (window.appready) {
        init();
    } else if (Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();
