function WrappedDeferred (object) {
    this._ = this.object = object;
    this.deferred = $.Deferred();

    this._ok = this.deferred.resolve;
    this._ng = this.deferred.reject;

    this.deferred.done(function (x) {
        console.log('[done]', object, x);
    }).fail(function (x) {
        console.log('[fail]', object, x);
    });
}

WrappedDeferred.prototype = {
    then:    function () { return this.deferred.then   .apply(this.deferred, arguments) },
    done:    function () { return this.deferred.done   .apply(this.deferred, arguments) },
    fail:    function () { return this.deferred.fail   .apply(this.deferred, arguments) },
    promise: function () { return this.deferred.promise.apply(this.deferred, arguments) }
};

function defer (object) { return new WrappedDeferred(object) }

var Notification = {
    error: function (title, message) {
        console.error(title, message);
        webkitNotifications.createNotification(
            '', title || 'Error', message || ''
        ).show();
    },
    notify: function (title, message) {
        console.log(title, message);
        webkitNotifications.createNotification(
            '', title || 'Notification', message || ''
        ).show();
    }
};

var View = {
    focus: function () {
        $('#content').focus();
    },
    updateCharacterCount: function () {
        $('#character-count').text($('#content').text().length);
    },
    updateRuler: function () {
        $('#ruler').empty();

        var line = 1,
            dimension = Session.orientation.isVertical() ? 'width' : 'height';
        while ($('#ruler')[dimension]() < $('#content')[dimension]()) {
            $('#ruler').append(line % 20 === 1 ? $('<span class="page-marker">').text(Math.floor(line / 20) + 1) : ' ').append('<br>');
            line++;
        }
    }
};

var Session = {
    content: {
        get: function () {
            var content = '';
            $(document.getElementById('content').childNodes).each(function () {
                content += $(this).is('br') ? '\n' : $(this).text();
            });
            return content;
        }
    },
    orientation: {
        isVertical: function () {
            return this.get() == 'vertical';
        },
        isHorizontal: function () {
            return this.get() == 'horizontal';
        },
        get: function () {
            return $(document.body).hasClass('vertical') ? 'vertical' : 'horizontal';
        },
        toggle: function () {
            $(document.body)
                .toggleClass('horizontal')
                .toggleClass('vertical');
        }
    },

    // http://developer.chrome.com/trunk/apps/fileSystem.html
    file: {
        fileEntry: null,

        reset: function () {
            this.fileEntry = null;
            $('#title-base').text('');
            $('#title-extension').text('');
        },

        save: function () {
            if (!this.fileEntry) {
                throw 'file not loaded';
            }

            var content = Session.content.get(),
                blob = new Blob([ content ], { type: 'text/plain' });

            with (defer(this.fileEntry)) {
                _.createWriter(_ok, _ng);

                var writer;

                then(function (w) { writer = w }).

                then(function () {
                    with (defer(writer)) {
                        _.onwriteend = _ok;
                        _.onerror    = _ng;
                        _.truncate(blob.size);
                        return deferred;
                    }
                }).

                then(function () {
                    with (defer(writer)) {
                        _.onwriteend = _ok;
                        _.onerror    = _ng;
                        _.seek(0);
                        _.write(blob);
                        return deferred;
                    }
                }).

                then(function () {
                    Notification.notify('File wrote');
                }).

                fail(function (e) {
                    Notification.error('Writing file failed', writer && writer.error || e);
                });
            }
        },

        open: function (fileEntry) {
            var File = this;

            this.reset();

            with (defer(fileEntry)) {
                _.file(_ok, _ng);

                then(function (file) {
                    with (defer(new FileReader())) {
                        _.onload  = _ok;
                        _.onerror = _ng;
                        _.readAsText(file);
                        return deferred;
                    }
                }).

                then(function (e) {
                    e.target.result.split(/\n/).forEach(function (line) {
                        $('#content').append(
                            document.createTextNode(line), '<br>'
                        );
                    });

                    File.fileEntry = fileEntry;

                    $('#content').trigger('kak:change');

                    View.focus();

                    chrome.fileSystem.getDisplayPath(fileEntry, function (path) {
                        var m = path.match(/([^\/]+?)(\.\w+)?$/);
                        if (m) {
                            $('#title-base').text(m[1]);
                            $('#title-extension').text(m[2]);
                        }
                    });
                }).

                fail(function (e) {
                    Notification.error('Opening file failed', e);
                });
            }
        }
    }
};

$(function () {
    $('#toggle-orientation').click(function () {
        Session.orientation.toggle();

        webkitNotifications.createNotification(
            '', 'Orientation changed', 'Orientation changed to ' + Session.orientation.get() + '.'
        ).show();
    });

    $('#save').click(function () {
        Session.file.save();
    });

    $('#content')
        .on('kak:change', function (e) {
            View.updateCharacterCount();
        })
        .on('keyup', function (e) {
            $(this).trigger('kak:change');
        });
});

var dnd = new DnDFileController('#content', function (data) {
    $('#content').empty();

    var fileEntry = data.items[0].webkitGetAsEntry();
    chrome.fileSystem.getWritableEntry(fileEntry, function (writeFileEntry) {
        Session.file.open(writeFileEntry);
    });
});
