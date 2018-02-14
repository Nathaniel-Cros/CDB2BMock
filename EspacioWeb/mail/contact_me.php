<?php

require("class.phpmailer.php");
require("class.smtp.php");

if(empty($_POST['name'])      ||
   empty($_POST['name_e'])    ||
   empty($_POST['email'])     ||
   empty($_POST['phone'])     ||
   empty($_POST['enti'])      ||
   empty($_POST['interes'])   ||
   empty($_POST['message'])   ||
   !filter_var($_POST['email'],FILTER_VALIDATE_EMAIL))
   {
   echo "Favor de llenar todos los campos";
   return false;
   }

   $name = $_POST['name'];
   $name_e = $_POST['name_e'];
   $email = $_POST['email'];
   $cel = $_POST['phone'];
   $enti = $_POST['enti'];
   $inter = $_POST['interes'];
   $mens = $_POST['message'];

$mensaje = "Nombre: " . $name . "<br>Nombre Empresa: " . $name_e . "<br>Email: " . $email . "<br>Telefono: " . $cel . "<br>Entidad Federativa: " . $enti . "<br>Perfil de Interes: " . $inter . "<br>Mensaje: " . $mens;
/* De quien es esl correo ya quien va dirigido*/
$mail_correo = new PHPMailer();
$mail_correo->From = "connected@connected2b.com";
$mail_correo->FromName = "Connected";

$mail_correo->AddAddress("comentarios@connected2b.com");
$mail_correo->AddAddress("oscnathanielrp@gmail.com");

$mail_correo->Subject = "COMENTARIOS";
$mail_correo->MsgHTML($mensaje);

if ($mail_correo->Send()){
    print("<script>alert('Envio Exitoso.');</script>");
    return true;
    //print("<meta http-equiv='refresh' content='0; url=../index.php' />");


}
else{
    print("<script>alert('Por favor ingrese los campos...');</script>");
    return false;
    //print("<meta http-equiv='refresh' content='0; url=../index.php' />");
}

return true;
?>
