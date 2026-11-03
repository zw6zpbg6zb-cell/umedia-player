
(function () {
    'use strict';

    // Umedia для Lampa 3.3.4
    // Версия 0.2.0

    if (window.umedia_lampa_plugin_loaded) return;
    window.umedia_lampa_plugin_loaded = true;

    var BASE = 'https://umedia.click/';
    var MENU_URL = BASE + 'tv.xml';
    var request = new Lampa.Reguest();

    function clean(value) {
        return String(value || '').trim();
    }

    function textOf(node, tag) {
        var el = node.getElementsByTagName(tag)[0];
        return el ? clean(el.textContent) : '';
    }

    function parseXML(source) {
        var doc = new DOMParser().parseFromString(
            source,
            'text/xml'
        );

        if (doc.getElementsByTagName('parsererror').length) {
            throw new Error('Не удалось разобрать XML');
        }

        var channels = Array.prototype.slice.call(
            doc.getElementsByTagName('channel')
        );

        return channels.map(function (channel) {
            return {
                title: textOf(channel, 'title')
                    .replace(/<[^>]*>/g, '')
                    .trim(),
                logo: textOf(channel, 'logo'),
                description: textOf(channel, 'description'),
                playlist: textOf(channel, 'playlist_url'),
                stream: textOf(channel, 'stream_url')
            };
        }).filter(function (item) {
            return item.title || item.playlist || item.stream;
        });
    }

    function notify(message) {
        if (Lampa.Noty && Lampa.Noty.show) {
            Lampa.Noty.show(message);
        }
    }

    function showError(error) {
        var message = error && error.message
            ? error.message
            : String(error || 'Неизвестная ошибка');

        notify('Umedia: ' + message);
    }

    function requestXML(url, callback) {
        request.get(
            url,
            function (response) {
                try {
                    var source = typeof response === 'string'
                        ? response
                        : (response && response.responseText
                            ? response.responseText
                            : '');

                    if (!source) {
                        throw new Error('Пустой ответ сервера');
                    }

                    callback(parseXML(source));
                } catch (error) {
                    showError(error);
                }
            },
            function (error) {
                showError(error || 'Ошибка загрузки Umedia');
            }
        );
    }

    function play(item) {
        if (!item.stream) return;

        Lampa.Player.play({
            url: item.stream,
            title: item.title || 'Umedia',
            source: 'Umedia'
        });
    }

    function openFeed(url, title) {
        requestXML(url, function (channels) {
            if (!channels.length) {
                notify('В этом разделе пока нет записей');
                return;
            }

            var items = channels.map(function (channel) {
                return {
                    title: channel.title || 'Без названия',
                    subtitle: channel.stream
                        ? 'Запустить'
                        : 'Открыть раздел',
                    item: channel
                };
            });

            Lampa.Select.show({
                title: title || 'Umedia',
                items: items,

                onSelect: function (selected) {
                    var item = selected && selected.item
                        ? selected.item
                        : null;

                    if (!item) return;

                    if (item.stream) {
                        play(item);
                    } else if (item.playlist) {
                        openFeed(item.playlist, item.title);
                    } else {
                        notify(
                            'Нет ссылки на плейлист или видео'
                        );
                    }
                }
            });
        });
    }

    function addButton() {
        if (!Lampa.Menu || !Lampa.Menu.addButton) {
            notify('Не найдено меню Lampa');
            return;
        }

        Lampa.Menu.addButton(
            'u',
            'Umedia',
            function () {
                openFeed(MENU_URL, 'Umedia');
            }
        );
    }

    function init() {
        if (!window.Lampa) return;
        addButton();
    }

    if (window.appready) {
        init();
    } else if (Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                init();
            }
        });
    }
})();

