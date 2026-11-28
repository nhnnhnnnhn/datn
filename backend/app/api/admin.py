from fastapi import APIRouter, Query, Response, status

from app.core.deps import AdminUser, DbSession
from app.schemas.admin import AdminUserIn, AdminUserPatch, IdiomIn
from app.services import admin_service, idiom_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def stats(db: DbSession, _admin: AdminUser):
    return admin_service.stats(db)


@router.get("/users")
def list_users(
    db: DbSession,
    _admin: AdminUser,
    q: str | None = None,
    role: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
):
    return admin_service.list_users(db, q=q, role=role, page=page, page_size=page_size)


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(body: AdminUserIn, db: DbSession, _admin: AdminUser):
    return admin_service.create_user(db, body)


@router.patch("/users/{user_id}")
def update_user(user_id: int, body: AdminUserPatch, db: DbSession, admin: AdminUser):
    return admin_service.update_user(db, admin, user_id, body.model_dump(exclude_unset=True))


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: DbSession, admin: AdminUser):
    admin_service.delete_user(db, admin, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/idioms", status_code=status.HTTP_201_CREATED)
def create_idiom(body: IdiomIn, db: DbSession, _admin: AdminUser):
    return idiom_service.create_idiom(db, body)


@router.patch("/idioms/{idiom_id}")
def update_idiom(idiom_id: int, body: IdiomIn, db: DbSession, _admin: AdminUser):
    return idiom_service.update_idiom(db, idiom_id, body)


@router.delete("/idioms/{idiom_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_idiom(idiom_id: int, db: DbSession, _admin: AdminUser):
    idiom_service.archive_idiom(db, idiom_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
