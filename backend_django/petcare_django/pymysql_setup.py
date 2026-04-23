def configure_pymysql():
    try:
        import pymysql
    except ImportError:
        return

    pymysql.install_as_MySQLdb()
