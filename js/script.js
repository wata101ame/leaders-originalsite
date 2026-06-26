$(function () {
  // ハンバーガーメニューをクリックしたときの処理
  $(".hamburger").click(function () {
    // メニューの表示切替
    $(".menu").toggleClass("open"); // メニューを開閉
    // ハンバーガーボタンのアクティブクラスを切り替えて三本線をバツにする
    $(this).toggleClass("active");
  });
});
