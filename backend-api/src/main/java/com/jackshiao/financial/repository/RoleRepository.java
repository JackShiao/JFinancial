package com.jackshiao.financial.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jackshiao.financial.entity.Role;

public interface RoleRepository extends JpaRepository<Role, Integer> {

    Optional<Role> findByRoleName(String roleName);

    // 別名方法，供 AuthService 以角色名稱查詢使用
    default Optional<Role> findByName(String name) {
        return findByRoleName(name);
    }
}
