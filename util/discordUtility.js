const ADMINISTRATOR_PERMISSION = 0x08;
const GUILD_TEXT_TYPE = "text";

module.exports = {
        HAS_USER_GET_ADMIN_PERMISSION : guild => (guild.permissions & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION,
        IS_GUILD_TEXT : channel => channel.type === GUILD_TEXT_TYPE,
    };