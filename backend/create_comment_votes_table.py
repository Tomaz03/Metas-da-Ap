from models import Base
from database import engine  # certifique-se de importar corretamente

Base.metadata.create_all(bind=engine)
print("Tabela 'comment_votes' criada com sucesso (se ainda não existia).")

