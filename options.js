$(function () {
    $('input').attr('disabled', true);

    chrome.storage.local.get({
        'preference.style.horizontal.font-family': 'sans-serif',
        'preference.style.vertical.font-family': 'serif'
    }, function (s) {
        $('[data-preference-key]')
            .val(function () {
                return s[ $(this).data('preference-key') ];
            })
            .keyup(function () {
                var update = {};
                update[ $(this).data('preference-key') ] = $(this).val();

                chrome.storage.local.set(
                    update, function () {
                        console.log(update);
                    }
                );
            })
            .attr('disabled', null);
    });
});
