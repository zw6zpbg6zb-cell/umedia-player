
(function () {
    'use strict';

    var ID = 'umedia_lampa_plugin';

    if (window[ID]) return;
    window[ID] = true;

    var VERSION = '0.3.1';

    var ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6v2h3v1H7v-1h3v-2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v10h16V7H4z"/></svg>';

    var initialized = false;

    function notify(text) {
        try {
            Lampa.Noty.show(text);
        } catch (e) {
            console.log('[Umedia]', text);
        }
    }

    function openUmedia() {
        notify('Umedia работает! Версия ' + VERSION);
    }

    function init() {
        if (initialized) return;
        initialized = true;

        console.log('[Umedia] Инициализация');

        // Сначала независимо добавляем кнопку меню
        try {
            if (!Lampa.Menu || !Lampa.Menu.addButton) {
                throw new Error('Lampa.Menu.addButton недоступен');
            }

            Lampa.Menu.addButton(
                ICON,
                'Umedia',
                openUmedia
            );

            console.log('[Umedia] Кнопка добавлена');
        } catch (e) {
            console.log('[Umedia] Ошибка меню:', e);
            notify('Umedia: ошибка меню — ' + e.message);
        }

        // Регистрацию компонента выполняем отдельно
        try {
            if (Lampa.Component && Lampa.Component.add) {
                Lampa.Component.add('umedia_test', function () {
                    return {
                        create: function () {
                            this.html = $('<div class="about">
                                <div class="about__title">Umedia</div>
                                <div class="about__text">Плагин запущен</div>
                            </div>');
                        },
                        render: function () {
                            return this.html;
                        },
                        start: function () {},
                        pause: function () {},
                        stop: function () {},
                        destroy: function () {}
                    };
                });
            }
        } catch (e) {
            console.log('[Umedia] Ошибка компонента:', e);
        }

        notify('Umedia: инициализация завершена');
    }

    function start() {
        if (window.appready) {
            init();
        } else if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') init();
            });
        }
    }

    try {
        start();
    } catch (e) {
        console.log('[Umedia] Ошибка запуска:', e);
    }
})();
