
(() => {
    if (typeof flatpickr === "undefined") return;

    const enhance = (input) => {
        if (input._flatpickr || input.dataset.noPicker !== undefined) return;
        const options = { dateFormat: "Y-m-d", allowInput: true, disableMobile: true };
        if (input.min) options.minDate = input.min;
        if (input.max) options.maxDate = input.max;
        if (input.id === "dateOfBirth") {
            // বয়স ১৮ বছর বা তার বেশি হতে হবে
            const d = new Date();
            d.setFullYear(d.getFullYear() - 18);
            options.maxDate = d;
        }
        flatpickr(input, options);
    };

    const scan = (root) => root.querySelectorAll('input[type="date"]').forEach(enhance);
    scan(document);

    new MutationObserver((records) => {
        records.forEach((r) => r.addedNodes.forEach((n) => {
            if (n.nodeType !== 1) return;
            if (n.matches && n.matches('input[type="date"]')) enhance(n);
            else if (n.querySelectorAll) scan(n);
        }));
    }).observe(document.documentElement, { childList: true, subtree: true });
})();