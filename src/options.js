$(function () {
    $('input[name]').attr('disabled', true);

    Prefs.get().done(function (prefs) {
        $('input[name]:not(:radio)')
            .val(function () {
                return prefs[ $(this).attr('name') ];
            })
            .keyup(function () {
            })
            .attr('disabled', null);

        $('input[name]:radio')
            .attr('checked', function () {
                return $(this).val() === prefs[ $(this).attr('name') ];
            })
            .click(function () {
                Prefs.set($(this).attr('name'), $(this).val()).done(function (u) {
                    console.log('saved', u);
                });
            })
            .attr('disabled', null);
    });

    $('#action-save').click(function () {
        $('input[name]:radio:checked, input[name]:not(:radio)').each(function () {
            Prefs.set($(this).attr('name'), $(this).val()).done(function (u) {
                console.log('saved', u);
            });
        });

        reflectToEditor();

        chrome.app.window.current().close();
    });
});
