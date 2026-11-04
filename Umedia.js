(function () {
    'use strict';

    var FLAG = 'umedia_lampa_v071';
    if (window[FLAG]) return;
    window[FLAG] = true;

    var MENU_URL = 'https://umedia.click/tv.xml';
    var CSS_ID = 'umedia-liquid-glass';
    var BATCH_SIZE = 8;
    var BATCH_DELAY = 24;

    var ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6v2h3v1H7v-1h3v-2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v10h16V7H4z"/></svg>';

    function notify(message, error) {
        Lampa.Noty.show(message, error ? { style: 'error', time: 6000 } : { time: 3000 });
    }

    function textOf(node, tag) {
        var el = node.getElementsByTagName(tag)[0];
        return el ? (el.textContent || '').trim() : '';
    }

    function cleanHtml(value) {
        var node = document.createElement('div');
        node.innerHTML = value || '';
        return (node.textContent || node.innerText || '').replace(/\s+/g, ' ').trim();
    }

    function secureUrl(url) {
        url = (url || '').trim();
        if (url.indexOf('//') === 0) return 'https:' + url;
        if (/^http:\/\/umedia\.click\//i.test(url)) return url.replace(/^http:/i, 'https:');
        return url;
    }

    function requestXml(url, done) {
        var network = new Lampa.Reguest();
        var finished = false;

        function finish(error, xml) {
            if (finished) return;
            finished = true;
            done(error, xml);
        }

        network.native(url, function (response) {
            try {
                var raw = typeof response === 'string' ? response : response.responseText || '';
                if (!raw) throw new Error('Сервер вернул пустой ответ');

                var xml = new DOMParser().parseFromString(raw, 'text/xml');
                if (xml.getElementsByTagName('parsererror').length) {
                    throw new Error('Ошибка разбора XML');
                }

                finish(null, xml);
            } catch (e) {
                finish(e);
            }
        }, function (xhr, exception) {
            var message = 'Ошибка загрузки данных';
            try {
                message = network.errorDecode(xhr, exception);
            } catch (e) {}

            finish(new Error(message));
        }, null, {
            dataType: 'text',
            timeout: 30000
        });

        return network;
    }

    function channelsFrom(xml) {
        return Array.prototype.slice.call(xml.getElementsByTagName('channel'));
    }

    function qualityOf(title, url) {
        var value = (title + ' ' + url).toLowerCase();

        if (/2160|uhd|4k/.test(value)) return '4K';
        if (/1080|fhd|full.?hd/.test(value)) return 'Full HD';
        if (/720|(^|[^a-z])hd([^a-z]|$)/.test(value)) return 'HD';
        if (/dvd|480|576/.test(value)) return 'SD';

        return 'Видео';
    }

    function normalizeTitle(title) {
        return title
            .replace(/\b(2160p?|uhd|4k|1080p?|fhd|full.?hd|720p?|hd|dvd|480p?)\b/ig, ' ')
            .replace(/[()[\]{}]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function parsePlaylist(xml) {
        var groups = Object.create(null);
        var movies = [];
        var sections = [];

        channelsFrom(xml).forEach(function (channel) {
            var title = cleanHtml(textOf(channel, 'title'));
            var stream = textOf(channel, 'stream_url');
            var playlist = textOf(channel, 'playlist_url');
            var poster = secureUrl(textOf(channel, 'logo'));
            var description = cleanHtml(textOf(channel, 'description'));

            if (!title) return;

            if (stream) {
                var key = normalizeTitle(title) || title.toLowerCase();

                var variant = {
                    title: title,
                    url: stream.trim(),
                    poster: poster,
                    quality: qualityOf(title, stream)
                };

                if (!groups[key]) {
                    groups[key] = {
                        title: title,
                        poster: poster,
                        description: description,
                        variants: []
                    };

                    movies.push(groups[key]);
                }

                var group = groups[key];

                if (!group.poster && poster) group.poster = poster;
                if (!group.description && description) group.description = description;

                if (!group.variants.some(function (v) {
                    return v.url === variant.url;
                })) {
                    group.variants.push(variant);
                }
            } else if (playlist) {
                sections.push({
                    title: title,
                    url: playlist.trim(),
                    logo: poster,
                    description: description,
                    search: textOf(channel, 'search_on') === 'search'
                });
            }
        });

        var rank = {
            '4K': 1,
            'Full HD': 2,
            'HD': 3,
            'SD': 4,
            'Видео': 5
        };

        movies.forEach(function (movie) {
            movie.variants.sort(function (a, b) {
                return rank[a.quality] - rank[b.quality];
            });
        });

        return {
            movies: movies,
            sections: sections
        };
    }

    function playVariant(variant) {
        if (!variant || !variant.url) {
            return notify('Не найдена ссылка на видео', true);
        }

        if (!Lampa.Player || typeof Lampa.Player.play !== 'function') {
            return notify('Не найден запуск плеера Lampa', true);
        }

        Lampa.Player.play({
            url: variant.url.trim(),
            title: variant.title || 'Umedia',
            quality: variant.quality || '',
            poster: variant.poster || ''
        });
    }

    function chooseVariant(movie) {
        if (!movie.variants || !movie.variants.length) {
            return notify('Не найдены ссылки на видео', true);
        }

        if (movie.variants.length === 1) {
            return playVariant(movie.variants[0]);
        }

        Lampa.Select.show({
            title: movie.title + ' — качество',
            items: movie.variants.map(function (v) {
                return {
                    title: v.quality,
                    subtitle: v.title,
                    variant: v
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
        var old = document.getElementById(CSS_ID);
        if (old) old.remove();

        var style = document.createElement('style');
        style.id = CSS_ID;

        style.textContent = `
            .umedia-scroll {
                display:flex;
                flex:0 0 auto;
                width:100%;
                height:calc(100vh - 7.5em);
                max-height:calc(100vh - 7.5em);
                min-height:0;
                overflow:hidden;
                box-sizing:border-box;
            }

            .umedia-screen {
                width:100%;
                min-height:100%;
                padding:1.3em 2.2em 3em;
                box-sizing:border-box;
                background:radial-gradient(
                    ellipse at 50% 0%,
                    rgba(80,115,170,.20),
                    transparent 58%
                );
            }

            .umedia-heading {
                font-size:1.55em;
                font-weight:750;
                letter-spacing:-.025em;
                margin:0 0 1.1em;
                color:#fff;
                text-shadow:0 2px 12px #0008;
            }

            .umedia-grid {
                display:grid;
                grid-template-columns:repeat(6,minmax(0,1fr));
                gap:1.25em 1em;
                padding:.35em .25em 3em;
                align-items:start;
            }

            .umedia-tile {
                position:relative;
                min-width:0;
                overflow:hidden;
                border-radius:.9em;
                background:linear-gradient(
                    145deg,
                    rgba(255,255,255,.16),
                    rgba(255,255,255,.035)
                );
                border:1px solid rgba(255,255,255,.22);
                box-shadow:0 5px 18px rgba(0,0,0,.28);
                z-index:0;
                backface-visibility:hidden;
            }

            .umedia-tile:before {
                content:"";
                position:absolute;
                inset:0;
                z-index:4;
                pointer-events:none;
                border-radius:inherit;
                background:linear-gradient(
                    135deg,
                    rgba(255,255,255,.18),
                    transparent 32%,
                    transparent 72%,
                    rgba(255,255,255,.06)
                );
            }

            .umedia-tile.focus {
                border:2px solid rgba(255,255,255,.98);
                box-shadow:
                    0 0 0 2px rgba(130,175,255,.75),
                    0 0 22px rgba(110,160,255,.32);
                z-index:5;
            }

            .umedia-poster {
                position:relative;
                width:100%;
                aspect-ratio:2/3;
                overflow:hidden;
                background:linear-gradient(145deg,#27364b,#101722);
            }

            .umedia-poster:after {
                content:"";
                position:absolute;
                inset:38% 0 0;
                pointer-events:none;
                background:linear-gradient(
                    180deg,
                    transparent,
                    rgba(4,8,15,.94)
                );
            }

            .umedia-poster img {
                display:block;
                width:100%;
                height:100%;
                object-fit:cover;
            }

            .umedia-section-art {
                height:100%;
                display:flex;
                align-items:center;
                justify-content:center;
                position:relative;
                overflow:hidden;
                background:radial-gradient(
                    ellipse at 50% 28%,
                    rgba(111,150,205,.58),
                    rgba(31,48,72,.9) 48%,
                    #0b111b 100%
                );
            }

            .umedia-section-art:after {
                content:"";
                position:absolute;
                inset:0;
                background:linear-gradient(
                    145deg,
                    rgba(255,255,255,.20),
                    transparent 38%,
                    rgba(0,0,0,.25)
                );
                pointer-events:none;
            }

            .umedia-section-logo {
                display:block;
                width:66%;
                height:60%;
                object-fit:contain;
                position:relative;
                z-index:1;
            }

            .umedia-section-fallback {
                font-size:4em;
                color:rgba(255,255,255,.85);
                position:relative;
                z-index:1;
            }

            .umedia-section-art-label {
                position:absolute;
                z-index:2;
                left:.75em;
                right:.65em;
                bottom:.85em;
                color:#fff;
                font-size:.95em;
                font-weight:750;
                line-height:1.15;
                text-shadow:0 2px 9px #000;
                text-transform:uppercase;
            }

            .umedia-poster-empty {
                height:100%;
                display:flex;
                align-items:center;
                justify-content:center;
                color:#ffffff88;
                font-size:2em;
            }

            .umedia-tile-title {
                position:absolute;
                z-index:2;
                left:.7em;
                right:.55em;
                bottom:.7em;
                font-size:.9em;
                font-weight:700;
                line-height:1.2;
                max-height:2.45em;
                overflow:hidden;
                color:#fff;
                text-shadow:0 2px 8px #000;
            }

            .umedia-tile-meta {
                position:absolute;
                z-index:3;
                right:.55em;
                top:.55em;
                background:rgba(15,23,36,.72);
                border:1px solid rgba(255,255,255,.36);
                border-radius:2em;
                padding:.32em .6em;
                color:#fff;
                font-size:.68em;
                font-weight:750;
            }

            @media(max-width:900px) {
                .umedia-grid {
                    grid-template-columns:repeat(4,minmax(0,1fr));
                }
            }

            @media(max-width:580px) {
                .umedia-screen {
                    padding:1em;
                }

                .umedia-grid {
                    grid-template-columns:repeat(3,minmax(0,1fr));
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
            step: 420
        });

        scroll.render(true).classList.add('umedia-scroll');

        var root = $('<div class="umedia-screen"></div>');
        var grid = $('<div class="umedia-grid"></div>');

        var alive = true;
        var request = null;
        var batchTimer = null;
        var imageQueue = [];
        var imageActive = 0;
        var lastFocus = null;
        var items = [];
        var cursor = 0;

        root.append(
            $('<div class="umedia-heading"></div>').text(
                object.title || 'Umedia'
            )
        );

        root.append(grid);
        scroll.append(root);

        function loadImages() {
            while (alive && imageActive < 4 && imageQueue.length) {
                (function (img) {
                    imageActive++;

                    img.onload = img.onerror = function () {
                        imageActive--;
                        loadImages();
                    };

                    img.src = img.getAttribute('data-src');
                })(imageQueue.shift());
            }
        }

        function sectionArtwork(item, poster) {
            poster.addClass('umedia-section-art');

            if (item.logo) {
                var logo = $('<img class="umedia-section-logo">')
                    .attr('src', secureUrl(item.logo));

                logo.on('error', function () {
                    $(this).remove();
                    poster.append(
                        '<div class="umedia-section-fallback">✦</div>'
                    );
                });

                poster.append(logo);
            } else {
                poster.append(
                    '<div class="umedia-section-fallback">✦</div>'
                );
            }

            poster.append(
                $('<div class="umedia-section-art-label"></div>')
                    .text(item.title)
            );
        }

        function addTile(item, isSection) {
            var tile = $('<div class="umedia-tile selector"></div>');
            var poster = $('<div class="umedia-poster"></div>');

            if (isSection) {
                sectionArtwork(item, poster);
            } else if (item.poster) {
                var img = $('<img loading="lazy">')
                    .attr('data-src', secureUrl(item.poster));

                img.on('error', function () {
                    $(this).remove();
                    poster.append(
                        '<div class="umedia-poster-empty">▶</div>'
                    );
                });

                poster.append(img);
                imageQueue.push(img[0]);
            } else {
                poster.append(
                    '<div class="umedia-poster-empty">▶</div>'
                );
            }

            tile.append(poster);

            if (!isSection) {
                tile.append(
                    $('<div class="umedia-tile-title"></div>')
                        .text(item.title)
                );
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
                    item.search ? openSearch(item) : openMovies(item);
                } else {
                    chooseVariant(item);
                }
            });

            tile.on('hover:focus', function () {
                lastFocus = $(this);
                scroll.update($(this), false);
                loadImages();
            });

            grid.append(tile);
        }

        function renderBatch() {
            if (!alive) return;

            var end = Math.min(cursor + BATCH_SIZE, items.length);

            while (cursor < end) {
                var entry = items[cursor++];
                addTile(entry.item, entry.section);
            }

            loadImages();

            if (cursor < items.length) {
                batchTimer = setTimeout(renderBatch, BATCH_DELAY);
            } else {
                focusCatalog();
            }
        }

        function setItems(sections, movies) {
            items = [];

            sections.forEach(function (item) {
                items.push({ item: item, section: true });
            });

            movies.forEach(function (item) {
                items.push({ item: item, section: false });
            });

            cursor = 0;
            renderBatch();
        }

        function focusCatalog() {
            if (!alive) return;

            var view = scroll.render(true);

            if (view) {
                Lampa.Controller.collectionSet(view);
            }
        }

        this.create = function () {
            addStyles();
            this.activity.loader(true);

            if (object.kind === 'sections') {
                request = requestXml(MENU_URL, function (error, xml) {
                    if (!alive) return;

                    self.activity.loader(false);

                    if (error) {
                        notify(error.message, true);
                        self.activity.empty();
                        return;
                    }

                    var sections = [];

                    channelsFrom(xml).forEach(function (channel) {
                        var title = cleanHtml(textOf(channel, 'title'));
                        var url = textOf(channel, 'playlist_url');

                        if (title && url) {
                            sections.push({
                                title: title,
                                url: url,
                                logo: secureUrl(textOf(channel, 'logo')),
                                search: textOf(channel, 'search_on') === 'search'
                            });
                        }
                    });

                    if (!sections.length) {
                        notify('В tv.xml не найдены разделы', true);
                        self.activity.empty();
                        return;
                    }

                    setItems(sections, []);
                });
            } else {
                request = requestXml(object.url, function (error, xml) {
                    if (!alive) return;

                    self.activity.loader(false);

                    if (error) {
                        notify(error.message, true);
                        self.activity.empty();
                        return;
                    }

                    var parsed = parsePlaylist(xml);

                    if (!parsed.sections.length && !parsed.movies.length) {
                        notify(
                            'В XML не найдены записи с playlist_url или stream_url',
                            true
                        );
                        self.activity.empty();
                        return;
                    }

                    console.log(
                        '[Umedia 0.7.1] sections:',
                        parsed.sections.length,
                        'movies:',
                        parsed.movies.length
                    );

                    setItems(parsed.sections, parsed.movies);
                });
            }

            return this.render();
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: focusCatalog,

                left: function () {
                    if (Navigator.canmove('left')) {
                        Navigator.move('left');
                    } else {
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
                    } else {
                        scroll.wheel(-420);
                    }
                },

                down: function () {
                    if (Navigator.canmove('down')) {
                        Navigator.move('down');
                    } else {
                        scroll.wheel(420);
                    }
                },

                back: function () {
                    Lampa.Activity.backward();
                }
            });

            focusCatalog();
            Lampa.Controller.toggle('content');
        };

        this.stop = function () {};

        this.render = function () {
            return scroll.render();
        };

        this.destroy = function () {
            alive = false;

            if (batchTimer) clearTimeout(batchTimer);
            imageQueue = [];

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
            notify(
                'В этой сборке Lampa недоступен штатный ввод текста',
                true
            );
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

            openMovies({
                title: 'Поиск: ' + query,
                url: base +
                    (base.indexOf('?') >= 0 ? '&' : '?') +
                    'search=' +
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

        console.log('[Umedia] Version 0.7.1 initialized');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();
