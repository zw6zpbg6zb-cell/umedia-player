
(function () {
    'use strict';

    var ID = 'umedia_lampa_plugin';

    if (window[ID]) return;
    window[ID] = true;

    var VERSION = '0.3.0';
    var MENU_URL = 'https://umedia.click/tv.xml';
    var COMPONENT = 'umedia_catalog';

    var ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6v2h3v1H7v-1h3v-2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v10h16V7H4z"/></svg>';

    function message(text) {
        try {
            Lampa.Noty.show(text);
        } catch (e) {
            console.log('[Umedia]', text);
        }
    }

    function loadXML(callback, error) {
        var xhr = new XMLHttpRequest();

        xhr.open('GET', MENU_URL, true);
        xhr.timeout = 20000;

        xhr.onload = function () {
            if (xhr.status < 200 || xhr.status >= 300) {
                error('Ошибка загрузки: HTTP ' + xhr.status);
                return;
            }

            try {
                var xml = new DOMParser().parseFromString(
                    xhr.responseText,
                    'text/xml'
                );

                if (xml.querySelector('parsererror')) {
                    error('Не удалось разобрать XML');
                    return;
                }

                var channels = Array.prototype.slice.call(
                    xml.querySelectorAll('channel')
                );

                var categories = channels.map(function (node) {
                    function get(tag) {
                        var el = node.querySelector(tag);
                        return el ? el.textContent.trim() : '';
                    }

                    return {
                        title: get('title'),
                        description: get('description'),
                        logo: get('logo'),
                        url: get('playlist_url') || get('stream_url')
                    };
                }).filter(function (item) {
                    return item.title;
                });

                callback(categories);
            } catch (e) {
                error('Ошибка обработки XML: ' + e.message);
            }
        };

        xhr.onerror = function () {
            error('Не удалось подключиться к Umedia');
        };

        xhr.ontimeout = function () {
            error('Время ожидания ответа Umedia истекло');
        };

        xhr.send();
    }

    function CatalogComponent(object) {
        var html;
        var scroll;

        this.create = function () {
            html = $('<div class="umedia-screen"><div class="umedia-content"><div class="broadcast__title">Загрузка Umedia...</div></div></div>');
        };

        this.render = function () {
            return html;
        };

        this.start = function () {
            var content = html.find('.umedia-content');

            loadXML(function (categories) {
                content.empty();

                if (!categories.length) {
                    content.append(
                        $('<div class="broadcast__title">Категории не найдены</div>')
                    );
                    return;
                }

                categories.forEach(function (category) {
                    var item = $('<div class="selector layer"></div>');
                    item.css({
                        padding: '1.2em',
                        margin: '0.5em 0',
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '0.4em'
                    });

                    item.append(
                        $('<div></div>').text(category.title)
                    );

                    if (category.description) {
                        item.append(
                            $('<div></div>').text(category.description)
                        );
                    }

                    item.on('hover:enter', function () {
                        if (category.url) {
                            message('Категория выбрана: ' + category.title);
                        } else {
                            message('Для этой категории пока нет ссылки');
                        }
                    });

                    content.append(item);
                });

                Lampa.Controller.toggle('content');
            }, function (error) {
                content.empty().append(
                    $('<div class="broadcast__title"></div>').text(error)
                );
                message(error);
            });
        };

        this.pause = function () {};
        this.stop = function () {};

        this.destroy = function () {
            if (html) html.remove();
        };
    }

    function openCatalog() {
        Lampa.Activity.push({
            url: '',
            title: 'Umedia',
            component: COMPONENT,
            page: 1
        });
    }

    function init() {
        if (!Lampa.Component || !Lampa.Activity || !Lampa.Menu) {
            message('Umedia: необходимые компоненты Lampa не найдены');
            return;
        }

        Lampa.Component.add(COMPONENT, CatalogComponent);

        if (Lampa.Manifest) {
            Lampa.Manifest.plugins = {
                type: 'other',
                version: VERSION,
                name: 'Umedia',
                description: 'Каталог Umedia для Lampa',
                component: COMPONENT
            };
        }

        Lampa.Menu.addButton(ICON, 'Umedia', openCatalog);

        console.log('[Umedia] Запущен, версия ' + VERSION);
    }

    function start() {
        if (window.appready) {
            init();
        } else {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') init();
            });
        }
    }

    try {
        start();
    } catch (e) {
        console.log('[Umedia] Ошибка запуска:', e);
        message('Umedia: ' + e.message);
    }
})();
