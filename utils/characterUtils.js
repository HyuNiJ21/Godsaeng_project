/**
 * 갓생 제조기 - 캐릭터 경험치 및 레벨업 관리 유틸리티
 * - 1분 = 1 EXP, 100 EXP = 1 레벨 규칙 적용
 */
const pool = require('../config/db');

// 레벨업에 필요한 경험치를 계산하는 함수 (항상 100으로 고정)
const getExpRequired = (level) => {
    return 100; 
};


/**
 * 캐릭터에게 경험치를 부여하고 레벨업을 확인 및 처리합니다.
 * (수정됨: 트랜잭션 유지를 위해 connection을 매개변수로 받음)
 * * @param {number} userId - 경험치를 부여할 사용자 ID
 * @param {number} expAmount - 부여할 경험치 양
 * @param {object} connection - 상위 로직(study/stop)에서 전달받은 DB 커넥션
 * @returns {object} - 업데이트된 레벨, 경험치 및 레벨업 여부
 */
const updateExpAndCheckLevelUp = async (userId, expAmount, connection) => {
    // --- 🔥 수정된 부분 (connection 재사용) ---
    // 이 함수는 이미 트랜잭션이 시작된 study.js에서 호출되므로
    // 새로운 connection을 만들지 않고, 전달받은 connection을 사용합니다.
    
    // let connection; // 삭제
    try {
        // connection = await pool.getConnection(); // 삭제
        // await connection.beginTransaction(); // 삭제 (이미 상위에서 시작됨)

        // 1. 현재 캐릭터 상태 조회 (level, exp)
        const [current] = await connection.execute(
            'SELECT level, exp FROM Characters WHERE userId = ?', 
            [userId]
        );

        if (current.length === 0) {
            // 이 함수는 트랜잭션의 일부이므로, 에러를 던져서 상위에서 롤백하도록 함
            throw new Error('Character not found'); 
        }
        
        let { level, exp } = current[0];
        let newExp = exp + expAmount;
        let levelUpOccurred = false;
        let originalLevel = level;

        // 2. 레벨업 체크 및 처리 (다중 레벨업 가능)
        let expRequired = getExpRequired(level); // 100
        while (newExp >= expRequired) { 
            newExp -= expRequired; 
            level += 1; 
            levelUpOccurred = true;
            expRequired = getExpRequired(level); // (다음 레벨 필요 경험치 - 지금은 항상 100)
        }

        // 3. DB 업데이트
        const sql = 'UPDATE Characters SET level = ?, exp = ? WHERE userId = ?';
        await connection.execute(sql, [level, newExp, userId]);

        // await connection.commit(); // 삭제 (상위 로직에서 커밋)
        
        return {
            oldLevel: originalLevel,
            newLevel: level,
            newExp: newExp,
            levelUpOccurred: levelUpOccurred
        };

    } catch (error) {
        // if (connection) { await connection.rollback(); } // 삭제 (상위 로직에서 롤백)
        console.error('경험치 업데이트 트랜잭션 오류:', error);
        throw error; // 오류를 상위로 전파
    } 
    // finally {
    //    if (connection) { connection.release(); } // 삭제 (상위 로직에서 릴리즈)
    // }
    // ---------------------------------------
};

module.exports = { updateExpAndCheckLevelUp, getExpRequired } // getExpRequired도 export