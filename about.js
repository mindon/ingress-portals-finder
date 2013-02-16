function idonate(key) {
  var fm = document.getElementById('fmdonate');
  fm['hosted_button_id'].value = key;
  fm.submit();
}

document.getElementById('mydonate').onclick = function(){
  idonate('YSVEJMBLM3AFG');
};

window.oncontextmenu = function(event){return false};
