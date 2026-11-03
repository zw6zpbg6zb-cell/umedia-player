(function () {
    'use strict';

    var FLAG = 'umedia_lampa_v067';
    if (window[FLAG]) return;
    window[FLAG] = true;

    var MENU_URL = 'https://umedia.click/tv.xml';
    var CSS_ID = 'umedia-catalog-style';

    var ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6v2h3v1H7v-1h3v-2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v10h16V7H4z"/></svg>';

    function notify(message, error) {
        Lampa.Noty.show(message, error
            ? { style: 'error', time: 6000 }
            : { time: 3000 }
        );
    }

    function textOf(node, tag) {
        var el = node.getElementsByTagName(tag)[0];
        return el ? (el.textContent || '').trim() : '';
    }

    function cleanHtml(value) {
        var node = document.createElement('div');
        node.innerHTML = value || '';

        return (node.textContent || node.innerText || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function requestXml(url, done) {
        var network = new Lampa.Reguest();
        var finished = false;

        function finish(error, xml) {
            if (finished) return;
            finished = true;
            done(error, xml);
        }

        network.native(
            url,
            function (response) {
                try {
                    var raw = typeof response === 'string'
                        ? response
                        : response.responseText || '';

                    if (!raw) {
                        throw new Error('Сервер вернул пустой ответ');
                    }

                    var xml = new DOMParser().parseFromString(
                        raw,
                        'text/xml'
                    );

                    if (xml.getElementsByTagName('parsererror').length) {
                        throw new Error('Не удалось разобрать XML');
                    }

                    finish(null, xml);
                }
                catch (e) {
                    finish(e);
                }
            },
            function (xhr, exception) {
                var message = 'Ошибка загрузки данных';

                try {
                    message = network.errorDecode(xhr, exception);
                }
                catch (e) {}

                finish(new Error(message));
            },
            null,
            {
                dataType: 'text',
                timeout: 30000
            }
        );
    }

    function channelsFrom(xml) {
        return Array.prototype.slice.call(
            xml.getElementsByTagName('channel')
        );
    }

    function qualityOf(title, url) {
        var value = (title + ' ' + url).toLowerCase();

        if (/2160|uhd|4k/.test(value)) return '4K / UHD';
        if (/1080|fhd|full.?hd/.test(value)) return 'Full HD';
        if (/720|(^|[^a-z])hd([^a-z]|$)/.test(value)) return 'HD';
        if (/dvd|480|576/.test(value)) return 'SD / DVD';

        return 'Видео';
    }

    function normalizeTitle(title) {
        return title
            .replace(/<[^>]*>/g, ' ')
            .replace(/\b(2160p?|uhd|4k|1080p?|fhd|full.?hd|720p?|hd|dvd|480p?)\b/ig, ' ')
            .replace(/[()[\]{}]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function parseMovies(xml) {
        var grouped = {};
        var result = [];

        channelsFrom(xml).forEach(function (channel) {
            var title = cleanHtml(textOf(channel, 'title'));
            var url = textOf(channel, 'stream_url');
            var poster = textOf(channel, 'logo');
            var description = textOf(channel, 'description');

            if (!title || !url) return;

            var key = normalizeTitle(title) || title.toLowerCase();

            var item = {
                title: title,
                url: url,
                poster: poster,
                description: description,
                quality: qualityOf(title, url)
            };

            if (!grouped[key]) {
                grouped[key] = {
                    title: title,
                    poster: poster,
                    description: description,
                    variants: []
                };

                result.push(grouped[key]);
            }

            var group = grouped[key];

            if (!group.poster && poster) group.poster = poster;
            if (!group.description && description) {
                group.description = description;
            }

            if (!group.variants.some(function (variant) {
                return variant.url === url;
            })) {
                group.variants.push(item);
            }
        });

        result.forEach(function (movie) {
            var order = {
                '4K / UHD': 1,
                'Full HD': 2,
                'HD': 3,
                'SD / DVD': 4,
                'Видео': 5
            };

            movie.variants.sort(function (a, b) {
                return (order[a.quality] || 9) -
                    (order[b.quality] || 9);
            });
        });

        return result;
    }

    function playVariant(variant) {
        if (!variant || typeof variant.url !== 'string' || !variant.url.trim()) {
            notify('Не найдена ссылка на видео', true);
            return;
        }

        if (!Lampa.Player || typeof Lampa.Player.play !== 'function') {
            notify('Не найден запуск плеера Lampa', true);
            return;
        }

        var playData = {
            url: variant.url.trim(),
            title: variant.title || 'Umedia',
            quality: variant.quality || '',
            poster: variant.poster || ''
        };

        console.log('[Umedia] Запуск видео:', playData);

        Lampa.Player.play(playData);
    }

    function chooseVariant(movie) {
        if (!movie.variants || !movie.variants.length) {
            notify('Не найдены ссылки на видео', true);
            return;
        }

        if (movie.variants.length === 1) {
            playVariant(movie.variants[0]);
            return;
        }

        Lampa.Select.show({
            title: movie.title + ' — качество',
            items: movie.variants.map(function (variant) {
                return {
                    title: variant.quality,
                    subtitle: variant.title,
                    variant: variant
                };
            }),
            onSelect: function (selected) {
                if (selected && selected.variant) {
                    playVariant(selected.variant);
                }
            }
        });
    }

    function addStyles() {
        if (document.getElementById(CSS_ID)) return;

        var style = document.createElement('style');
        style.id = CSS_ID;

        style.textContent = `
            .umedia-scroll {
                display: flex;
                flex: 0 0 auto;
                width: 100%;
                height: calc(100vh - 7.5em);
                max-height: calc(100vh - 7.5em);
                min-height: 0;
                overflow: hidden;
                box-sizing: border-box;
            }

            .umedia-screen {
                width: 100%;
                min-height: 100%;
                padding: 1.2em 2.2em 3em;
                box-sizing: border-box;
            }

            .umedia-heading {
                font-size: 1.45em;
                font-weight: 600;
                margin: 0 0 1.1em;
                color: var(--color-white, #fff);
            }

            .umedia-grid {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: 1.1em .8em;
                padding-bottom: 3em;
            }

            .umedia-tile {
                min-width: 0;
                position: relative;
                border-radius: .35em;
                overflow: hidden;
                background: rgba(255,255,255,.06);
                outline: 0 solid transparent;
                transform: scale(1);
                transition: transform .12s, outline .12s;
            }

            .umedia-tile.focus {
                outline: .18em solid #fff;
                transform: scale(1.045);
                z-index: 2;
            }

            .umedia-poster {
                position: relative;
                width: 100%;
                aspect-ratio: 2 / 3;
                background: rgba(255,255,255,.08);
            }

            .umedia-poster img {
                display: block;
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .umedia-section-art {
                height: 100%;
                min-height: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
                background:
                    radial-gradient(circle at 72% 20%, rgba(255,255,255,.19), transparent 36%),
                    linear-gradient(145deg, var(--umedia-art-a), var(--umedia-art-b));
            }

            .umedia-section-art:before,
            .umedia-section-art:after {
                content: '';
                position: absolute;
                border: 1px solid rgba(255,255,255,.13);
                border-radius: 50%;
                width: 11em;
                height: 11em;
                right: -5em;
                bottom: -5em;
            }

            .umedia-section-art:after {
                width: 7em;
                height: 7em;
                right: auto;
                bottom: auto;
                left: -3.5em;
                top: -3.5em;
                border-color: rgba(255,255,255,.09);
            }

            .umedia-section-art svg {
                position: relative;
                z-index: 1;
                width: 34%;
                max-width: 4.2em;
                height: auto;
                filter: drop-shadow(0 .25em .45em rgba(0,0,0,.22));
            }

            .umedia-section-art-label {
                position: absolute;
                z-index: 1;
                left: .65em;
                right: .65em;
                bottom: .85em;
                color: rgba(255,255,255,.96);
                font-size: .9em;
                font-weight: 700;
                line-height: 1.12;
                text-align: left;
                text-shadow: 0 1px 5px rgba(0,0,0,.3);
            }

            .umedia-section-art-kicker {
                position: absolute;
                z-index: 1;
                top: .8em;
                left: .75em;
                color: rgba(255,255,255,.72);
                font-size: .55em;
                font-weight: 700;
                letter-spacing: .16em;
                text-transform: uppercase;
            }

            .umedia-poster-empty {
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: rgba(255,255,255,.45);
                font-size: 2em;
            }

            .umedia-tile-title {
                font-size: .82em;
                line-height: 1.25;
                padding: .55em .5em .65em;
                min-height: 3.3em;
                box-sizing: border-box;
                overflow: hidden;
                color: #fff;
            }

            .umedia-tile-meta {
                position: absolute;
                right: .35em;
                top: .35em;
                background: rgba(0,0,0,.78);
                color: #fff;
                border-radius: .2em;
                padding: .22em .35em;
                font-size: .65em;
            }

            @media(max-width:900px) {
                .umedia-grid {
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                }
            }

            @media(max-width:580px) {
                .umedia-screen {
                    padding: 1em;
                }

                .umedia-grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
            }
        `;

        document.head.appendChild(style);
    }

    function CatalogScreen(object) {
        var self = this;

        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            step: 480
        });

        scroll.render(true).classList.add('umedia-scroll');

        var root = $('<div class="umedia-screen"></div>');
        var grid = $('<div class="umedia-grid"></div>');

        var alive = true;
        var request = null;
        var lastFocus = false;

        root.append(
            $('<div class="umedia-heading"></div>').text(
                object.title || 'Umedia'
            )
        );

        root.append(grid);
        scroll.append(root);

        function focusCatalog() {
            if (!alive) return;

            var view = scroll.render();

            Lampa.Controller.collectionSet(view);
            Lampa.Controller.collectionFocus(lastFocus || false, view);
        }

        function sectionArtwork(item, poster) {
            var name = (item.title || '').toLowerCase();

            var art = {
                icon: '<path d="M10 3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-8l-2-4Z"/><path d="M2 11h20"/><path d="m10 15 5 3-5 3v-6Z"/>',
                color: ['#294c72', '#14263f'],
                kicker: 'UMEDIA'
            };

            if (/поиск|search/.test(name)) {
                art = {
                    icon: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
                    color: ['#315f79', '#193447'],
                    kicker: 'FIND'
                };
            }
            else if (/нов|new|прем|свеж/.test(name)) {
                art = {
                    icon: '<path d="m12 2 2.7 6.2L21 11l-6.3 2.8L12 20l-2.7-6.2L3 11l6.3-2.8L12 2Z"/><path d="m19 15 1.2 2.8L23 19l-2.8 1.2L19 23l-1.2-2.8L15 19l2.8-1.2L19 15Z"/>',
                    color: ['#8b5637', '#4c2d28'],
                    kicker: 'JUST ADDED'
                };
            }
            else if (/избран|favorite|любим/.test(name)) {
                art = {
                    icon: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
                    color: ['#784b65', '#3d2a45'],
                    kicker: 'YOUR LIST'
                };
            }
            else if (/сериал|series|тв/.test(name)) {
                art = {
                    icon: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="m8 21 4-4 4 4M8 9h8M8 13h5"/>',
                    color: ['#376c70', '#1c3b4a'],
                    kicker: 'SERIES'
                };
            }
            else if (/мульт|дет|kids|анимац/.test(name)) {
                art = {
                    icon: '<circle cx="12" cy="12" r="9"/><path d="M8 10h.01M16 10h.01M8.5 15s1.2 2 3.5 2 3.5-2 3.5-2"/>',
                    color: ['#65754b', '#344633'],
                    kicker: 'FAMILY'
                };
            }
            else if (/фильм|кино|movie/.test(name)) {
                art = {
                    icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
                    color: ['#4e5d82', '#252f50'],
                    kicker: 'MOVIES'
                };
            }

            poster.addClass('umedia-section-art').css({
                '--umedia-art-a': art.color[0],
                '--umedia-art-b': art.color[1]
            });

            poster.append(
                $('<div class="umedia-section-art-kicker"></div>').text(art.kicker),
                $('<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"></svg>').html(art.icon),
                $('<div class="umedia-section-art-label"></div>').text(item.title)
            );
        }

        function addTile(item, isSection) {
            var tile = $('<div class="umedia-tile selector"></div>');
            var poster = $('<div class="umedia-poster"></div>');

            var title = $('<div class="umedia-tile-title"></div>')
                .text(item.title);

            if (isSection) {
                sectionArtwork(item, poster);
            }
            else if (item.poster) {
                $('<img loading="lazy">')
                    .attr('src', item.poster)
                    .on('error', function () {
                        $(this).remove();

                        poster.append(
                            '<div class="umedia-poster-empty">▶</div>'
                        );
                    })
                    .appendTo(poster);
            }
            else {
                poster.append(
                    '<div class="umedia-poster-empty">▶</div>'
                );
            }

            tile.append(poster);

            if (!isSection) {
                tile.append(title);
            }

            if (!isSection && item.variants) {
                var label = item.variants.length > 1
                    ? item.variants.length + ' качества'
                    : item.variants[0].quality;

                tile.append(
                    $('<div class="umedia-tile-meta"></div>').text(label)
                );
            }

            tile.on('hover:enter', function () {
                if (isSection) {
                    if (item.search) {
                        openSearch(item);
                    }
                    else {
                        openMovies(item);
                    }
                }
                else {
                    chooseVariant(item);
                }
            });

            tile.on('hover:focus', function () {
                lastFocus = $(this);
                scroll.update($(this), true);
            });

            grid.append(tile);
        }

        this.create = function () {
            addStyles();
            this.activity.loader(true);

            if (object.kind === 'sections') {
                request = new Lampa.Reguest();

                request.native(
                    MENU_URL,

                    function (response) {
                        if (!alive) return;

                        try {
                            var raw = typeof response === 'string'
                                ? response
                                : response.responseText || '';

                            if (!raw) {
                                throw new Error('Umedia вернул пустой ответ');
                            }

                            var xml = new DOMParser().parseFromString(
                                raw,
                                'text/xml'
                            );

                            if (xml.getElementsByTagName('parsererror').length) {
                                throw new Error('Ошибка XML');
                            }

                            var sections = [];

                            channelsFrom(xml).forEach(function (channel) {
                                var title = cleanHtml(
                                    textOf(channel, 'title')
                                );

                                var url = textOf(
                                    channel,
                                    'playlist_url'
                                );

                                var search = textOf(
                                    channel,
                                    'search_on'
                                ) === 'search';

                                if (title && (url || search)) {
                                    sections.push({
                                        title: title,
                                        url: url,
                                        search: search
                                    });
                                }
                            });

                            self.activity.loader(false);

                            if (!sections.length) {
                                notify('В tv.xml не найдены разделы playlist_url', true);
                                self.activity.empty();
                                return;
                            }

                            sections.forEach(function (section) {
                                addTile(section, true);
                            });

                            focusCatalog();
                        }
                        catch (e) {
                            self.activity.loader(false);
                            notify(e.message, true);
                            self.activity.empty();
                        }
                    },

                    function (xhr, exception) {
                        if (!alive) return;

                        self.activity.loader(false);

                        var message = 'Не удалось загрузить Umedia';

                        try {
                            message = request.errorDecode(xhr, exception);
                        }
                        catch (e) {}

                        notify(message, true);
                        self.activity.empty();
                    },

                    null,

                    {
                        dataType: 'text',
                        timeout: 30000
                    }
                );
            }
            else {
                requestXml(object.url, function (error, xml) {
                    if (!alive) return;

                    self.activity.loader(false);

                    if (error) {
                        notify(error.message, true);
                        self.activity.empty();
                        return;
                    }

                    var nestedSections = [];

                    channelsFrom(xml).forEach(function (channel) {
                        var sectionTitle = cleanHtml(
                            textOf(channel, 'title')
                        );

                        var sectionUrl = textOf(
                            channel,
                            'playlist_url'
                        );

                        var search = textOf(
                            channel,
                            'search_on'
                        ) === 'search';

                        if (sectionTitle && (sectionUrl || search)) {
                            nestedSections.push({
                                title: sectionTitle,
                                url: sectionUrl,
                                search: search
                            });
                        }
                    });

                    if (nestedSections.length) {
                        nestedSections.forEach(function (section) {
                            addTile(section, true);
                        });

                        focusCatalog();
                        return;
                    }

                    var movies = parseMovies(xml);

                    if (!movies.length) {
                        notify(
                            'В ответе Umedia не найдены фильмы со stream_url',
                            true
                        );

                        self.activity.empty();
                        return;
                    }

                    movies.forEach(function (movie) {
                        addTile(movie, false);
                    });

                    focusCatalog();
                });
            }

            return this.render();
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    var view = scroll.render();

                    Lampa.Controller.collectionSet(view);
                    Lampa.Controller.collectionFocus(lastFocus || false, view);
                },

                left: function () {
                    if (Navigator.canmove('left')) {
                        Navigator.move('left');
                    }
                    else {
                        Lampa.Controller.toggle('menu');
                    }
                },

                right: function () {
                    if (Navigator.canmove('right')) {
                        Navigator.move('right');
                    }
                },

                up: function () {
                    if (Navigator.canmove('up')) {
                        Navigator.move('up');
                    }
                    else {
                        scroll.wheel(-480);
                    }
                },

                down: function () {
                    if (Navigator.canmove('down')) {
                        Navigator.move('down');
                    }
                    else {
                        scroll.wheel(480);
                    }
                },

                back: function () {
                    Lampa.Activity.backward();
                }
            });

            Lampa.Controller.collectionSet(scroll.render());
            Lampa.Controller.collectionFocus(lastFocus || false, scroll.render());
            Lampa.Controller.toggle('content');
        };

        this.stop = function () {};

        this.render = function () {
            return scroll.render();
        };

        this.destroy = function () {
            alive = false;

            if (request && request.clear) {
                request.clear();
            }

            scroll.destroy();
            root.remove();
        };
    }

    function openSections() {
        Lampa.Activity.push({
            url: '',
            title: 'Umedia',
            component: 'umedia_catalog',
            kind: 'sections',
            page: 1
        });
    }

    function openMovies(section) {
        Lampa.Activity.push({
            url: section.url,
            title: section.title,
            component: 'umedia_catalog',
            kind: 'movies',
            page: 1
        });
    }

    function openSearch(section) {
        if (!Lampa.Input || typeof Lampa.Input.edit !== 'function') {
            notify('В этой сборке Lampa недоступен штатный ввод текста', true);
            return;
        }

        Lampa.Input.edit({
            title: section.title || 'Поиск в Umedia',
            value: '',
            free: true,
            nosave: true,
            keyboard: 'lampa'
        }, function (value) {
            var query = (value || '').trim();

            if (!query) return;

            var base = section.url ||
                'https://umedia.click/modules/tv/films.php?searchType=filmName';

            var separator = base.indexOf('?') >= 0 ? '&' : '?';

            openMovies({
                title: 'Поиск: ' + query,
                url: base + separator + 'search=' +
                    encodeURIComponent(query)
            });
        });
    }

    function addMenuItem() {
        var list = $('.menu .menu__list').eq(0);

        if (!list.length ||
            list.find('.umedia-menu-item').length) {
            return;
        }

        var button = $(
            '<li class="menu__item selector umedia-menu-item">' +
                '<div class="menu__ico">' + ICON + '</div>' +
                '<div class="menu__text">Umedia</div>' +
            '</li>'
        );

        button.on('hover:enter', openSections);
        list.append(button);
    }

    function init() {
        addStyles();

        if (!Lampa.Component.get('umedia_catalog')) {
            Lampa.Component.add(
                'umedia_catalog',
                CatalogScreen
            );
        }

        addMenuItem();

        console.log('[Umedia] Version 0.6.7 initialized');
    }

    if (window.appready) {
        init();
    }
    else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                init();
            }
        });
    }

})();
