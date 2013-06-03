var Notification = {
    error: function (title, message) {
        console.error(title, message);
        webkitNotifications.createNotification(
            '', title || 'Error', message
        ).show();
    },
    notify: function (title, message) {
        console.log(title, message);
        webkitNotifications.createNotification(
            '', title || 'Notification', message
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

            this.fileEntry.createWriter(function (writer) {
                var content = Session.content.get(),
                    blob = new Blob([ content ], { type: 'text/plain' });

                writer.onerror = function (e) {
                    Notification.error('Writing file failed', writer.error);
                };
                writer.onwriteend = function (e) {
                    writer.onwriteend = function (e) {
                        Notification.notify('File wrote');
                    };
                    writer.seek(0)
                    writer.write(blob);
                };

                writer.truncate(blob.size);
            }, function (e) {
                Notification.error('Creating writer failed', e);
            });
        },

        open: function (fileEntry) {
            var File = this;

            this.reset();

            fileEntry.file(function (file) {
                var reader = new FileReader();
                reader.onerror = function (e) {
                    Notification.error('Reading file failed', e);
                };
                reader.onload = function (e) {
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
                };

                reader.readAsText(file);
            }, function (e) {
                Notification.error('Opening file failed', e);
            });
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
