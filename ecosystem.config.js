module.exports = {
    apps: [
      {
        name: 'cashgiftcode',
        exec_mode: 'cluster',
        instances: '1',
        script: 'dist/app.js', // your script
        args: 'start',
        env: {
            PORT:4000,
            MYSQL_HOST:"localhost",
            MYSQL_USER:"play2win",
            MYSQL_PASSWORD:"j075LkjoFXWK5Skm14",
            MYSQL_DATABASE:"5games",
            MAIL:'contact@oneup.ng',
            MAIL_PASSWORD:'Murphy@08033978357',
            SESSION_SECRET_LETTER:"anything-secret",
            SECRET_KEY:"my-anything-secret",
            MAIL_ADMIN : "ommziteamlead08@gmail.com",
            CONVERT_CURENCY_KEY : '938792fc36202506f425b0f97ba3596c',
            FROM : '5Games <contact@universus.com>',
            ACCOUNT_SID:'AC37b5ed350ca090d1a707d60afca99ee8',
            AUTH_TOKEN :'1edd4094403932e86cb402e436e69d8c',
            SERVICE_ID :'VA97a16b75136c2739d89971b506563ec3',
            PUSH_TOKEN : "jm13og7YP1XErTwkoZ0L1F7SLnZOygGiR1RTm03w1mJ3uKVCEZTwgb3E8pPZe3bY6PWQbejI3VHXUGVpo5Zs",
            PUSH_CODE : "E1F52-634BF",
        },
      },
    ],
  };
  