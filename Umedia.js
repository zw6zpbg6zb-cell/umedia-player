
(function () {
    'use strict';

    var FLAG = 'umedia_lampa_v051';
    if (window[FLAG]) return;
    window[FLAG] = true;

    var MENU_URL = 'https://umedia.click/tv.xml';

    var ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6v2h3v1H7v-1h3v-2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v10h16V7H4z"/></svg>';

    function notify(message, error) {
        Lampa.Noty.show(message, error
            ? { style: 'error', time: 6000 }
            : { time: 3000 }
        );
    }

    function cleanTitle(value) {
        var node = document.createElement('div');
        node.innerHTML = value || '';
        return (node.textContent || node.innerText || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getText(node, tag) {
        var el = node.getElementsByTagName(tag)[0];
        return el ? (el.textContent || '').trim() : '';
    }

    // Запрос через штатную сеть Lampa
    function requestXml(url, done) {
        var completed = false;

        function finish(error, xml) {
            if (completed) return;
            completed = true;
            done(error, xml);
        }

        Lampa.Reguest.native(
            url,

            function (response) {
                try {
                    var text = typeof response === 'string'
                        ? response
                        : response.responseText || '';

                    if (!text) {
                        throw new Error('Сервер вернул пустой ответ');
                    }

                    var xml = new DOMParser().parseFromString(
                        text,
                        'text/xml'
                    );

                    if (xml.getElementsByTagName('parsererror').length) {
                        throw new Error('Ошибка разбора XML');
                    }

                    finish(null, xml);
                }
                catch (e) {
                    finish(new Error(e.message));
                }
            },

            function (xhr, exception) {
                var message = 'Ошибка загрузки';

                try {
                    message = Lampa.Reguest.errorDecode(
                        xhr,
                        exception
                    );
                }
                catch (e) {}

                finish(new Error(message));
            },

            null,

            {
                dataType: 'text',
                timeout: 25000
            }
        );
    }

    function getChannels(xml) {
        return Array.prototype.slice.call(
            xml.getElementsByTagName('channel')
        );
    }

    function openMovies(section) {
        notify('Загружаю: ' + section.title);

        requestXml(section.url, function (error, xml) {
            if (error) {
                notify(error.message, true);
                return;
            }

            var channels = getChannels(xml);
            var items = [];

            channels.forEach(function (channel) {
                var title = cleanTitle(getText(channel, 'title'));
                var stream = getText(channel, 'stream_url');
                var poster = getText(channel, 'logo');
                var description = getText(channel, 'description');

                if (!title || !stream) return;

                var quality = '';

                if (/uhd|2160|4k/i.test(title + ' ' + stream)) {
                    quality = 'UHD / 4K';
                }
                else if (/fhd|1080/i.test(title + ' ' + stream)) {
                    quality = 'Full HD';
                }
                else if (/hd|720/i.test(title + ' ' + stream)) {
                    quality = 'HD';
                }

                items.push({
                    title: title,
                    subtitle: quality || 'Umedia',
                    url: stream,
                    poster: poster,
                    description: description
                });
            });

            if (!items.length) {
                notify(
                    'В ответе сервера нет доступных ссылок на видео',
                    true
                );
                return;
            }

            Lampa.Select.show({
                title: section.title,

                items: items.map(function (item) {
                    return {
                        title: item.title,
                        subtitle: item.subtitle,
                        item: item
                    };
                }),

                onSelect: function (selected) {
                    Lampa.Select.close();

                    var item = selected.item;

                    if (!item || !item.url) return;

                    if (Lampa.Player &&
                        typeof Lampa.Player.play === 'function') {
                        Lampa.Player.play(item.url);
                    }
                    else {
                        notify(
                            'Не найден метод запуска плеера',
                            true
                        );
                    }
                },

                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        });
    }

    function openSearch() {
        Lampa.Input.show({
            title: 'Поиск в Umedia',
            placeholder: 'Название фильма',
            value: '',

            onBack: function () {
                Lampa.Controller.toggle('content');
            },

            onSelect: function (value) {
                var query = (value || '').trim();

                if (!query) return;

                var url =
                    'https://umedia.click/modules/tv/search.php' +
                    '?searchType=fileTitle&search=' +
                    encodeURIComponent(query);

                openMovies({
                    title: 'Поиск: ' + query,
                    url: url
                });
            }
        });
    }

    function openCatalog() {
        notify('Подключаюсь к Umedia');

        requestXml(MENU_URL, function (error, xml) {
            if (error) {
                notify(error.message, true);
                return;
            }

            var channels = getChannels(xml);
            var sections = [];

            channels.forEach(function (channel) {
                var title = cleanTitle(getText(channel, 'title'));
                var url = getText(channel, 'playlist_url');
                var search = getText(channel, 'search_on');

                if (!title || !url) return;

                sections.push({
                    title: title,
                    url: url,
                    search: search === 'search'
                });
            });

            if (!sections.length) {
                notify('Разделы Umedia не найдены', true);
                return;
            }

            Lampa.Select.show({
                title: 'Umedia',

                items: sections.map(function (section) {
                    return {
                        title: section.title,
                        subtitle: section.search
                            ? 'Поиск и фильтр'
                            : 'Открыть раздел',
                        section: section
                    };
                }),

                onSelect: function (selected) {
                    Lampa.Select.close();

                    if (selected.section.search) {
                        openSearch();
                    }
                    else {
                        openMovies(selected.section);
                    }
                },

                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        });
    }

    function addMenuItem() {
        var list = $('.menu .menu__list').eq(0);

        if (!list.length) return;

        if (list.find('.umedia-menu-item').length) return;

        var button = $(
            '<li class="menu__item selector umedia-menu-item">' +
                '<div class="menu__ico">' + ICON + '</div>' +
                '<div class="menu__text">Umedia</div>' +
            '</li>'
        );

        button.on('hover:enter', openCatalog);

        list.append(button);
    }

    function init() {
        addMenuItem();
        console.log('[Umedia] Version 0.5.1 initialized');
    }

    if (window.appready) {
        init();
    }
    else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }

})();
