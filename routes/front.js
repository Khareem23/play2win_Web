const
    app = require('express').Router(),
    model = require('../models/user'),
    db = require('../models/db'),
    mw = require('../models/middlewares'),
    fs = require("fs");
const fileUpload = require('express-fileupload');
     
    app.post('/offer',  function(req, res) {
        let name, base64_str, percentage;
        name = req.body.name;
        percentage = req.body.percentage;
        let avatar = req.files.avatar;
        avatar.mv('./public/uploads/'+req.files.avatar.name, async function(err) {
        if (err)
            return res.status(500).send(err);
      
        let base64_str =  new Buffer(fs.readFileSync('./public/uploads/'+req.files.avatar.name)).toString("base64")
   
        await model.updateOffer(name, base64_str, percentage);
         fs.unlinkSync('./public/uploads/'+req.files.avatar.name);
            res.redirect('/admin/offer/?msg=success');
        });
    });
  
    app.get('/', function(req, res){
    	
    	if(req.session.id){
    		res.redirect('/admin/dashboard');
    	}else{
    		res.redirect('/login');
    	}
    });

 

    app.get('/commission', mw.IsAdmin, function(req, res){
        model.getCommission()
              .then((result)=> {
                let rs = result[0].profit_percent;
                data = rs.split(',');
                res.render('admin/commission', data);
              })  
        
    });

    app.get('/commission', mw.IsAdmin, function(req, res){
        
        model.setCommission()
                      
    });

    app.post('/commission', mw.IsAdmin, function(req, res){
       
        let {body:{adminshare, usershare}} = req;
  
        model.setCommission(adminshare+','+usershare)
             .then((result)=> { console.log('result',result);
                res.status(200).json({result:{ 'success': true, mssg: 'user logout successfully' }});
            })
              
    });

    app.get('/users', mw.IsAdmin, function(req, res){
    	var users;
    	model.userlist(req, res)
    	 .then(rows => {
    	 	users = rows;
    	 	//console.log('users', rows);
    	res.render('admin/users',{users});
    	 })	 
    });

    app.get('/spent_log/:id', mw.IsAdmin, function(req, res){
        var logs, id;
        id = req.params.id;

    	model.spentLogByuser(id)
    	 .then(rows => {
    	 	logs = rows;
    	 	//console.log('users', rows);
    	res.render('admin/userdetails',{logs});
    	 })	 
    });
  

    app.get('/game-played-per-day', mw.IsAdmin, function(req, res){
        var users;
        //let gamePerday = await model.gamePerday();
    	model.gamePerday()
    	 .then(rows => {
            gamePerday = rows;
    	 	//console.log('users', rows);
    	res.render('admin/game-played',{gamePerday});
    	 })
    	 
    });

    app.get('/user-per-table', mw.IsAdmin, function(req, res){
        var users;
        //let gamePerday = await model.gamePerday();
    	model.getUsersPerPool(null,1)
    	 .then((result) => {

    	res.render('admin/user-per-table',{result});
    	 })
    	 
    });

    app.get('/edituser/:id', mw.IsAdmin, function(req, res){
        var id = req.params.id;

    	model.getUserDetails(id)
              .then((profile) => { console.log(profile);
     			res.render('admin/edituser',{ profile: profile });
                });	
    });

    app.get('/tablelist', mw.IsAdmin, function(req, res){
    	
    	model.tableList(req, res)
    	 .then(rows => {
    	 	tableList = rows;
    	res.render('admin/tableList',{tableList});
    	 })
    	 
    });
    app.get('/tablelist_vl', mw.IsAdmin, function(req, res){
    	
    	model.tableList(vl='_vl')
    	 .then(rows => {
    	 	tableList = rows;
    	res.render('admin/tableList_vl',{tableList});
    	 })
    	 
    });

    app.get('/edittable/:id', mw.IsAdmin, function(req, res){
        var id = req.params.id;

    	model.getTableById(id)
              .then((list) => {
     			res.render('admin/edittable',{ list });
                });	
    });

    app.get('/edittable_vl/:id', mw.IsAdmin, function(req, res){
        var id = req.params.id;

    	model.getTableById(id,vl='_vl')
              .then((list) => {
     			res.render('admin/edittable_vl',{ list });
                });	
    });

    app.get('/createtable', mw.IsAdmin, function(req, res){
     			res.render('admin/addtable');
    });

    app.get('/offer', mw.IsAdmin, async function(req, res){
            [{name, offer_percentage}] = await model.getOffer();
        res.render('admin/offer',{name, offer_percentage, req});
    });
    
    app.get('/difficulty_level', mw.IsAdmin, async function(req, res){
        let [{difficulty_level}]  = await model.getLevel();
        res.render('admin/difficulty_level',{difficulty_level});
    });

    app.get('/createtable_vl', mw.IsAdmin, function(req, res){
        res.render('admin/addtable_vl');
    });

    app.get('/kycrequests', mw.IsAdmin, function(req, res){
    	var kycRequest;
    	model.kycRequest(req, res)
    	 .then(rows => {
    	 	kycRequest = rows;
    	 	//console.log('users', rows);
    	res.render('admin/kycRequest',{kycRequest});
    	 })
    	 
    });

    app.get('/redeemrequests', mw.IsAdmin, function(req, res){
    	var redeemRequest;
    	model.redeemRequest(req, res)
    	 .then(rows => {
    	 	redeemRequest = rows;
    	 	//console.log('users', rows);
    	res.render('admin/redeemRequest',{redeemRequest});
    	 })
    	 
    });
    app.get('/payment_history', mw.IsAdmin, function(req, res){
    	var paymentHistory;
    	model.getPaymentHistory()
    	     .then(rows => {
               paymentHistory = rows;
    	 	
    	res.render('admin/paymentHistory',{paymentHistory});
    	 })
    	 
    });

    app.get('/download', function (req, res, next) {

        var filePath = "/uploads/"; // Or format the path using the `id` rest param
        var fileName = req.body // The default name the browser will use
    
        res.download(filePath, fileName);    
        next();  
    });

    app.get('/adduser', mw.IsAdmin, function(req, res){
    	res.render('admin/adduser');
    });

    /**
	*For create pool table
	*/
    app.post('/createtable', mw.IsAdmin, function(req, res){
        
        let {body:{name, bet, percentage,tabletype, targetlines,vl}} = req
        let data = {
            name, bet, percentage, tabletype,targetlines
        }

        if(!vl){
         vl=''
        }

    	model.createTable(data,vl)
    		 .then(result => {
                 console.log('result:',result);
    		 	// res.end(JSON.stringify({'result':{ mssg: 'Record updated successfully', success: true }}));
            res.redirect('/admin/tablelist'+vl) ;
            });    	
    });
    // app.use(function (err, req, res, next) {
    //     if (err instanceof multer.MulterError) res.status(500).send(err.message);
    //     else next(err);
    //   });

    app.post('/difficulty_level', mw.IsAdmin, function(req, res){
        let {body:{level}} = req
        model.updateLevel(level)
             .then(result => {        
          res.redirect('/admin/difficulty_level') ;
       });  
        
    });

        /**
	*For create pool table
	*/
    app.post('/updatetable', mw.IsAdmin, function(req, res){
        
        let {body:{id, name, bet, percentage,tabletype, targetlines,vl}} = req
        let data = {
            id,name, bet, percentage, tabletype, targetlines
        }
        if(!vl){
            vl=''
           }
       
    	model.updateTable(data,vl)
    		 .then(result => {
                 console.log('result:',result);
    		 	// res.end(JSON.stringify({'result':{ mssg: 'Record updated successfully', success: true }}));
            res.redirect('/admin/tablelist'+vl) ;
            });    	
    });


    app.post('/tbldelete', function (req, res, next) {
	
        let { body: { id: id,vl} } = req  
        if(!vl){
            vl=''
           }
         console.log('id', id);
         model.deleteRecord(id,'pooltables'+vl)
             .then((result) => {
                 console.log('result:',result)
                 res.json({result:{ mssg: 'Record Deleted successfully', success: true }});
             }); 
     });


    app.post('/updateuserinfo', mw.IsAdmin, function(req, res){

    	model.updateUser(req, res)
    		 .then(result => {
    		 console.log('result', result);
    		 	res.end(JSON.stringify({'result':{ mssg: 'Record updated successfully', success: true }}));
    		 });
              	
    });

    /**
	*For update user's status
	*/
	app.post('/updateuserstatus', mw.IsAdmin, function (req, res) {
          
        model.updateUserStatus(req, res); 
   
    });


    /**
	*For update user's status (bank account for kyc)
	*/
	app.post('/updateaccountstatus', mw.IsAdmin, function (req, res) {
          
        model.updateAccountStatus(req, res); 
   
    });


    /**
	*For update Redeem Request
	*/
	app.post('/updateredeemstatus', mw.IsAdmin, function (req, res) {
          
        model.updateRedeemStatus(req, res); 
   
    });
    
    app.post('/user/delete', function (req, res, next) {
	
	   let { body: { id: id} } = req  
    	
    	console.log('id', id);
    	model.deleteRecord(id,'users')
    		.then(result => {
    			//console.log('result', result);
    			res.end(JSON.stringify({'result':{ mssg: 'Record Deleted successfully', success: true }}));
    		}); 
	});

    app.get('/login', mw.NotLoggedIn, function(req, res){
    	res.render('admin/login');
    });

    app.post('/login', mw.NotLoggedIn,function(req, res){
    	model.login(req, res);
    });

    app.get('/logout', (req, res) => {

    
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (ip.substr(0, 7) == "::ffff:") {
        ip = ip.substr(7)
    }
 
    if (req.session.id) {

        let last_activity = {
            user_id: req.session.id,
            ip: ip,
            status: '0'
        }
        db.updateActivity({ online: 'n', id: req.session.id });
        db.addActivity(last_activity)

        req.session.id = null
        res.redirect('/admin/login')

    } else {
        return res.status(400).json({ 'error': true, mssg: 'Bad Request' });
    }

});

    module.exports = app