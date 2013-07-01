$(function () {
    $('input[name]').attr('disabled', true);

    Prefs.get().done(function (prefs) {
        $('input[name]:not(:radio)')
            .val(function () {
                return prefs[ $(this).attr('name') ];
            })
            .keyup(function () {
                Prefs.set($(this).attr('name'), $(this).val()).done(function (u) {
                    console.log('saved', u);
                });
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
});
