if (location.pathname == "/admin/login") {
  $("#footer").attr("style", "display:none");
}

/**
 * Login
 *
 */

/*  $('.mapboxgl-ctrl-geocoder--input1').on('keyup',function (e) {
   
    e.preventDefault();
    //let address = $('input[name="name"]').val();mapboxgl-ctrl-geocoder--input
     let address = $(this).val();//$('.mapboxgl-ctrl-geocoder--input').val();
     //console.log('this',$(this).val())
    console.log('address',address);
    $.ajax({
      type: 'GET',
      //data: JSON.stringify(data),
      contentType: 'application/json',
      url: 'https://api.mapbox.com/geocoding/v5/mapbox.places/'+address+'.json?access_token=pk.eyJ1Ijoic2hpdmFtZ2FyZzkxIiwiYSI6ImNqeGN1bGEwaDAwdXU0MnBoejN5NHVrMG4ifQ.G1fNaAWnPBQgkjtB-RBh7A',
      success: function (response) {
        console.log(response);
        console.log(response.features);
        //console.log(response.features.);
      },
      error: function () {
        console.log('error');
      }
    });
  });*/

$(function () {
  /**
   *
   *For change password
   */
  $("#update-password-btn").click(function (e) {
    e.preventDefault();
    var data = {};
    data.password = $("#new-password").val();
    data.confirmPassword = $("#confirm-password").val();
    data.email = $("#email").val();
    data.userid = $("#userid").val();

    if (data.password == "") {
      $.notify("password can't be empty", "error");
      return false;
    } else if (data.confirmPassword == "") {
      $.notify("Confirm password can't be empty", "error");
      return false;
    } else if (data.password != data.confirmPassword) {
      $.notify("password doesn't match", "error");
      return false;
    }
    $.ajax({
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      url: "/apis/updatepassword",
      success: function (data) {
        console.log(data);
        if (data.success == true) {
          $.notify("Updated Successfully!!", "success");
          //  setTimeout(function () {window.close();
          //    window.location.replace('intent:#Intent;action=com.poolgame.launch;category=android.intent.category.DEFAULT;category=android.intent.category.BROWSABLE;end');
          //  }, 2000);
          $("#update-password-btn").attr("disabled", true);
        } else {
          //alert(data);
          $.notify(data.mssg, "error");
          window.location.replace("/error");
        }
      },
      error: function () {
        console.log("error");
      },
    });
  });
  jQuery("#phone, #pin, #code").keyup(function () {
    this.value = this.value.replace(/[^0-9\.]/g, "");
  });
  function isValidemail(email) {
    var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    console.log(regex.test(email));
    return regex.test(email);
  }
  $("#register").click(function (e) {
    var username = null;
    var email = $("#email").val();
    var username = $("#username").val();
    var phone = $("#phone").val();
    var pin = $("#pin").val();
    if (email == "") {
      $("#email").focus();
      $.notify("Please enter email address", "error");
    } else if (!isValidemail(email)) {
      $("#email").focus();
      $.notify("Enter valid email address!", "error");
    } else if (phone.length < 10 && phone != "") {
      $("#phone").focus();
      $.notify("Enter valid phone number!", "error");
    } else if (username == "" || username.length < 3) {
      $("#username").focus();
      $.notify("Please enter valid username", "error");
    } else if (pin == "" || pin.length < 4 || pin.length > 4) {
      $("#pin").focus();
      $.notify("Pin must be of 4 digits", "error");
    } else {
      phone = "+" + phone;
      register({ username, email, phone, pin });
    }
  });

  function register(data) {
    data.gender = $("#gender").val();
    usr = data.email;
    console.log(data);
    $.ajax({
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      url: "/apis/signup",
      success: function (data) {
        console.log("data:", data);
        if (data.result.success == true) {
          // $.notify("Registration successful. Verify you phone.", "success");
          $.notify("Registration successful. Please login.", "success");

          data.result.p = pin;
          data.result.u = usr;
          localStorage.setItem("user", JSON.stringify(data.result));
          setTimeout(function () {
            // window.location.replace("/verify-phone");
            window.location.replace("/login");
           
          }, 1000);
        } else {
          $.notify(data.result.error, "error");
        }
      },
      error: function (err) {
        console.log(err);
        $.notify(err.responseJSON.result.message, "error");

        console.log("error");
      },
    });
  }

  $("#forgotpass").click(function (e) {
    var email = $("#email").val();
    if (email == "") {
      $("#email").focus();
      $.notify("Please enter email address", "error");
    } else if (!isValidemail(email)) {
      $("#email").focus();
      $.notify("Enter valid email address!", "error");
    } else {
      $.ajax({
        type: "POST",
        data: JSON.stringify({ email }),
        contentType: "application/json",
        url: "/apis/forgotpassword",
        success: function (data) {
          console.log("data:", data);
          if (data.result.success == true) {
            $.notify(data.result.mssg, "success");
          } else {
            $.notify(data.result.error, "error");
          }
        },
        error: function (err) {
          console.log(err);
          $.notify(err.responseJSON.mssg, "error");

          console.log("error");
        },
      });
    }
  });

  $("#VerifyPhone").click(function (e) {
    var phone = $("#phone").val();
    var code = $("#code").val();
    if (phone.length < 10 && phone != "") {
      $("#phone").focus();
      $.notify("Enter valid phone number!", "error");
    } else if (code == "") {
      $("#code").focus();
      $.notify("Code rquired", "error");
    } else {
      phone = "+" + phone;
      $.ajax({
        type: "POST",
        data: JSON.stringify({ phone, code }),
        contentType: "application/json",
        url: "/apis/phoneverifyCheck",
        success: function (data) {
          console.log("data:", data);
          if (data.result.success == true) {
            $.notify(data.result.status, "success");
            setTimeout(function () {
              window.location.replace("/login");
             
            }, 1000);
          } else {
            $.notify(data.result.status, "error");
          }
        },
        error: function (err) {
          console.log(err);
          $.notify(err.responseJSON.result.error.message, "error");

          console.log("error");
        },
      });
    }
  });

  $("#login").click(function (e) {
    e.preventDefault();
    var theForm = $(this);
    var formID = theForm.attr("id");
    var data = {};
    data.email = $('input[name="email"]').val();
    data.password = $('input[name="password"]').val();
    pin = data.password;
    usr = data.email;
    $.ajax({
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      url: "/apis/login-web",
      success: function (data) {
        console.log("data:", data);
        if (data.result.success == true) {
          $.notify("Access granted", "success");
          if (data.result.isadmin == 1) {
            console.log("admin");
            window.location.replace("admin/dashboard");
          }
          if (data.result.isadmin == 0) {
            data.result.p = pin;
            data.result.u = usr;
            localStorage.setItem("user", JSON.stringify(data.result));
            window.location.replace("user/dashboard");
          } else {
            window.location.replace("/");
          }
        } else {
          $.notify(data.result.mssg, "error");
          if (data.result.mssg == "You need to verify your number.")
          {
            setTimeout(function () {
              window.location.replace("/verify-phone");
             
            }, 1000);
          }
         
          
        }
      },
      error: function (err) {
        console.log(err.responseJSON.errors);
        err.responseJSON.errors.forEach((element) => {
          $.notify(element, "error");
        });

        console.log("error");
      },
    });
  });

  $(".on-off").click(function (e) {
    var data = {};

    data.id = $.parseJSON($(this).attr("data-id"));
    data.status = $.parseJSON($(this).attr("data-status"));

    $.ajax({
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      url: "/admin/updateuserstatus",
      success: function (data) {
        let output = $.parseJSON(data);
        if (output.result.success == true) {
          $.notify("Updated successfully", "success");
          setTimeout(function () {
            location.reload();
          }, 1000);
        } else {
          $.notify(output.result.mssg, "error");
        }
      },
      error: function () {
        console.log("error");
      },
    });
  });

  $(".approve").click(function (e) {
    var data = {};

    data.id = $(this).attr("data-id");
    data.status = $(this).attr("data-status");

    $.ajax({
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      url: "/admin/updateaccountstatus",
      success: function (data) {
        let output = $.parseJSON(data);
        if (output.result.success == true) {
          $.notify("Updated successfully", "success");
          setTimeout(function () {
            location.reload();
          }, 1000);
        } else {
          $.notify(output.result.mssg, "error");
        }
      },
      error: function () {
        console.log("error");
      },
    });
  });

  $(".redeem").click(function (e) {
    var data = {};

    data.id = $(this).attr("data-id");
    data.status = $(this).attr("data-status");
    data.amount = $(this).attr("data-amount");
    data.uid = $(this).attr("data-uid");
    $("#overlay").attr("style", "display:block");
    $.ajax({
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      url: "/admin/updateredeemstatus",
      success: function (data) {
        let output = $.parseJSON(data);
        if (output.result.success == true) {
          $("#overlay").attr("style", "display:none");
          $.notify("Updated successfully", "success");
          setTimeout(function () {
            location.reload();
          }, 1000);
        } else {
          $("#overlay").attr("style", "display:none");
          $.notify(output.result.mssg, "error");
        }
      },
      error: function () {
        console.log("error");
      },
    });
  });

  $("#withdralform").on("submit", function (e) {
    e.preventDefault();
    var theForm = $(this);
    var formID = theForm.attr("id");
    var data = {};
    data.userid = $('input[name="id"]').val();
    var no_of_coins = $("#no_of_coins").val();
    data.amount = $("#amount").val();

    if (parseInt(data.amount) < 25) {
      $.notify(
        "Please enter greater value.Minimum amount to be withdrawn is 25.",
        "error"
      );
      return;
    }
    if (parseInt(data.amount) > parseInt(no_of_coins)) {
      $.notify("You can't withdraw more than you have.", "error");
      return;
    }

    $.ajax({
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      url: "/apis/addredeemrequest01",
      success: function (data) {
        //console.log('data', data);
        if (data.result.success == true) {
          $.notify("Updated successfully", "success");
          setTimeout(function () {
            window.location = "/success";
          }, 1000);
        } else {
          $.notify(output.result.mssg, "error");
        }
      },
      error: function () {
        console.log("error");
      },
    });
  });

  $("#edituserfm").on("submit", function (e) {
    e.preventDefault();
    var theForm = $(this);
    var formID = theForm.attr("id");
    var data = {};
    data.userid = $('input[name="id"]').val();
    data.no_of_coins = $("#no_of_coins").val();

    $.ajax({
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      url: "/admin/updateuserinfo",
      success: function (data) {
        let output = $.parseJSON(data);
        if (output.result.success == true) {
          $.notify("Updated successfully", "success");
          setTimeout(function () {
            //location.reload();
          }, 1000);
        } else {
          $.notify(output.result.mssg, "error");
        }
      },
      error: function () {
        console.log("error");
      },
    });
  });

  $("#commission").on("submit", function (e) {
    e.preventDefault();
    var theForm = $(this);
    var formID = theForm.attr("id");
    var data = {};
    data.adminshare = $("#admin-share").val();
    data.usershare = $("#user-share").val();
    if (parseInt(data.adminshare) + parseInt(data.usershare) > 100) {
      $.notify("Sum of both fields should be 100", "error");
      return;
    }

    $.ajax({
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      url: "/admin/commission",
      success: function (data) {
        console.log("data", data);
        if (data.result.success == true) {
          $.notify("Updated successfully", "success");
          setTimeout(function () {
            location.reload();
          }, 1000);
        } else {
          $.notify(data.result.mssg, "error");
        }
      },
      error: function () {
        console.log("error");
      },
    });
  });

  $(".del").click(function (e) {
    var data = {};

    data.id = $.parseJSON($(this).attr("data-id"));
    $.ajax({
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      url: "/admin/user/delete",
      success: function (data) {
        let output = $.parseJSON(data);
        if (output.result.success == true) {
          $.notify("Deleted successfully", "success");
          setTimeout(function () {
            location.reload();
          }, 1000);
        } else {
          $.notify(output.result.mssg, "error");
        }
      },
      error: function () {
        console.log("error");
      },
    });
  });
});

$(".deltbl").click(function (e) {
  var data = {};

  data.id = $.parseJSON($(this).attr("data-id"));
  data.vl = $.parseJSON($(this).attr("data-vl"));
  if (data.vl == 1) {
    data.vl = "_vl";
  }
  if (data.id) {
    $.ajax({
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      url: "/admin/tbldelete",
      success: function (data) {
        console.log("data:", data);
        if (data.result.success == true) {
          $.notify("Deleted successfully", "success");
          setTimeout(function () {
            location.reload();
          }, 1000);
        } else {
          $.notify(data.result.mssg, "error");
        }
      },
      error: function () {
        console.log("error");
      },
    });
  }
});

$(document).ready(function () {
  $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
    var min = $("#min").datepicker("getDate");
    var max = $("#max").datepicker("getDate");
    var startDate = new Date(data[8]);
    if (min == null && max == null) {
      return true;
    }
    if (min == null && startDate <= max) {
      return true;
    }
    if (max == null && startDate >= min) {
      return true;
    }
    if (startDate <= max && startDate >= min) {
      return true;
    }
    return false;
  });

  $("#min").datepicker({
    onSelect: function () {
      table.draw();
    },
    changeMonth: true,
    changeYear: true,
  });
  $("#max").datepicker({
    onSelect: function () {
      table.draw();
    },
    changeMonth: true,
    changeYear: true,
  });
  var table = $("#datatable-checkbox").DataTable({
    //dom: "Blfrtip",
    buttons: [
      {
        extend: "csv",
        className: "btn-sm",
      },
    ],
    responsive: true,
    pageLength: 25,
    lengthMenu: [
      [25, 50, 100, -1],
      [25, 50, 100, "All"],
    ],
    dom: '<"top"fliB>rt<"bottom"p><"clear">',
  });

  // Event listener to the two range filtering inputs to redraw on input
  $("#min, #max").change(function () {
    table.draw();
  });
});

//   $(function() {
//     var oTable = $("#datatable-checkbox").DataTable({
//     //dom: "Blfrtip",
//     buttons: [
//     {
//       extend: "csv",
//       className: "btn-sm"
//     },
//     ],
//     responsive: true,
//     "pageLength": 25,
//     "lengthMenu": [[25, 50, 100, -1], [25, 50, 100, "All"]],
//     "dom": '<"top"fliB>rt<"bottom"p><"clear">'
//   });

//   $("#datepicker_from").datepicker({
//     showOn: "button",
//     buttonImage: "images/calendar.gif",
//     buttonImageOnly: false,
//     "onSelect": function() {
//       minDateFilter = new Date(this.value).getTime();
//       oTable.draw();
//     }
//   }).keyup(function() {
//     minDateFilter = new Date(this.value).getTime();
//     oTable.draw();
//   });
// });

// $.fn.dataTable.ext.search.push(
//   function( settings, data, dataIndex ) {
//       var min = parseInt( $('#min').val(), 10 );
//       var max = parseInt( $('#max').val(), 10 );
//       var age = parseFloat( data[3] ) || 0; // use data for the age column

//       if ( ( isNaN( min ) && isNaN( max ) ) ||
//            ( isNaN( min ) && age <= max ) ||
//            ( min <= age   && isNaN( max ) ) ||
//            ( min <= age   && age <= max ) )
//       {
//           return true;
//       }
//       return false;
//   }
// );
