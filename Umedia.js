
(function () {
    'use strict';

    if (window.umedia_lampa_ready) return;
    window.umedia_lampa_ready = true;

    var BASE = 'https://umedia.click/';
    var MENU_ICON = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v3H4zm0 6h16v3H4zm0 6h16v3H4z"/></svg>';

    var sections = [
        {
            title: 'ПОИСК ПО НАЗВАНИЮ',
            url: 'modules/tv/search.php?searchType=fileTitle',
            search: true
        },
        {
            title: 'НОВОЕ СЕГОДНЯ',
            url: 'modules/tv/search.php?searchType=fileToday'
        },
        {
            title: 'НОВОЕ ЗА НЕДЕЛЮ',
            url: 'modules/tv/search.php?searchType=file7day'
        },
        {
            title: 'КОЛЛЕКЦИИ',
            url: 'tv_playlist/film_collections.xml'
        },
        {
            title: 'ИЗБРАННОЕ',
            url: 'modules/tv/favorites.php',
            favorites: true
        },
        {
            title: 'ФИЛЬМЫ ULTRA HD',
            url: 'tv_playlist/uhd.xml'
        },
        {
            title: 'ФИЛЬМЫ',
            url: 'tv_playlist/films.xml'
        },
        {
            title: 'МУЛЬТФИЛЬМЫ',
            url: 'tv_playlist/film_animation.xml'
        },
        {
            title: 'СЕРИАЛЫ',
            url: 'tv_playlist/serials.xml'
        }
    ];

    function notify(message) {
        if (window.Lampa && Lampa.Noty) {
            Lampa.Noty.show(message);
        }
    }

    function request(url, success, error) {
        var network = new Lampa.Reguest();
        network.timeout(20000);

        network.silent(
            url,
            success,
            function (a) {
                console.log('[Umedia] Ошибка запроса:', url, a);
                if (error) error(a);
                else notify('Не удалось загрузить Umedia');
            },
            false,
            { dataType: 'text' }
        );
    }

    function absoluteURL(url) {
        if (!url) return '';

        url = url.trim().replace(/#.*$/, '');

        if (url.indexOf('//') === 0) {
            url = 'https:' + url;
        }

        if (url.indexOf('http://') === 0) {
            url = url.replace('http://', 'https://');
        }

        if (url.charAt(0) === '/') {
            url = BASE.replace(/\/$/, '') + url;
        }

        return url;
    }

    function parseXML(text) {
        var xml = new DOMParser().parseFromString(text, 'text/xml');

        if (xml.getElementsByTagName('parsererror').length) {
            throw new Error('Некорректный XML');
        }

        var nodes = xml.getElementsByTagName('channel');
        var result = [];

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];

            function field(name) {
                var el = node.getElementsByTagName(name)[0];
                return el ? (el.textContent || '').trim() : '';
            }

            var item = {
                title: field('title'),
                logo: absoluteURL(field('logo')),
                description: field('description'),
                url: absoluteURL(field('playlist_url')),
                stream: absoluteURL(field('stream_url')),
                year: '',
                quality: ''
            };

            if (item.title && (item.url || item.stream)) {
                result.push(item);
            }
        }

        return result;
    }

    function showItems(items, title) {
        if (!items.length) {
            notify('В этом разделе пока нет записей');
            return;
        }

        var list = items.map(function (item) {
            return {
                title: item.title.replace(/<[^>]*>/g, '').trim(),
                item: item
            };
        });

        Lampa.Select.show({
            title: title,
            items: list,
            onSelect: function (selected) {
                var item = selected.item;

                if (item.stream) {
                    play(item);
                } else if (item.url) {
                    loadCatalog(item.url, item.title);
                } else {
                    notify('Для этой записи пока нет ссылки на видео');
                }
            },
            onBack: function () {
                openMenu();
            }
        });
    }

    function play(item) {
        if (!item.stream) {
            notify('Прямая ссылка на видео не найдена');
            return;
        }

        Lampa.Player.play({
            url: item.stream,
            title: item.title,
            source: 'Umedia'
        });
    }

    function loadCatalog(url, title) {
        notify('Загружаем: ' + title);

        request(url, function (response) {
            try {
                var items = parseXML(response);
                console.log('[Umedia] Загружено записей:', items.length, url);
                showItems(items, title);
            } catch (e) {
                console.log('[Umedia] Ошибка XML:', e);
                notify('Не удалось разобрать каталог Umedia');
            }
        });
    }

    function openSection(section) {
        if (section.search) {
            notify('Поиск подключим после проверки параметров формы Umedia');
            return;
        }

        if (section.favorites) {
            notify('Для избранного нужен персональный код OTTPlayer. Добавим его в настройки.');
            return;
        }

        loadCatalog(BASE + section.url, section.title);
    }

    function openMenu() {
        var items = sections.map(function (section) {
            return {
                title: section.title,
                section: section
            };
        });

        Lampa.Select.show({
            title: 'Umedia',
            items: items,
            onSelect: function (selected) {
                openSection(selected.section);
            }
        });
    }

    function init() {
        Lampa.Menu.addButton(
            MENU_ICON,
            'Umedia',
            openMenu
        );

        console.log('[Umedia] Плагин загружен');
        notify('Плагин Umedia подключён');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }

})();

