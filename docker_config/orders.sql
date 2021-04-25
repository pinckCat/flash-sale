create database flash_sale default character set utf8 collate utf8_general_ci;

use flash_sale;

create table orders (
    id integer primary key not null auto_increment, user_id integer not null,
    address_id integer not null,
    product_name varchar(255) not null,
    product_price decimal(10,5) not null,
    status boolean not null,
    create_at timestamp not null default current_timestamp,
    update_at timestamp not null on update current_timestamp default current_timestamp
    )CHARACTER SET utf8 COLLATE utf8_general_ci;
