document.addEventListener('DOMContentLoaded', function() {
    var sideNav = M.Sidenav.init(document.querySelectorAll('.sidenav'), {});
    var dropdowns = M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'), {});
    var selects = M.FormSelect.init(document.querySelectorAll('select'), {});
    var tabs = M.Tabs.init(document.querySelectorAll('.tabs'), {
        onShow: tab => M.Tabs.init(document.querySelectorAll('.nested'), {})
        });
});