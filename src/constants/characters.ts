// 캐릭터 데이터 상수

// 아바타 이미지 자동 불러오기
const avatarModules = import.meta.glob('../assets/avatar/**/*.webp', {
    eager: true,
    query: '?url',
    import: 'default'
}) as Record<string, string>;

// 캐릭터 JSON 데이터 자동 불러오기
const characterModules = import.meta.glob('../character/**/*.json', {
    eager: true,
    import: 'default'
}) as Record<string, any>;

export const avatarMap: Record<string, string> = {};
export const characterOptions: Array<{ value: string; label: string; data: any }> = [];

// 두 모듈을 매칭시키기 위한 처리 로직
for (const path in characterModules) {
    const data = characterModules[path];

    // "잠깐 백업"과 같은 백업 폴더는 불러오지 않음
    if (path.includes('backup')) continue;

    // 파일명 추출 (예: "../character/tetra/t_sr_neve.json" -> "t_sr_neve")
    const filenameMatch = path.match(/\/([^/]+)\.json$/);
    if (!filenameMatch) continue;

    const filename = filenameMatch[1];

    // 옵션에 캐릭터 데이터 추가
    characterOptions.push({
        value: filename, // 기존에는 'little_mermaid' 같은 형태를 value로 썼으나 파일명을 직접 쓰면 더 고유함
        label: data.characterName,
        data: data
    });

    // 매칭되는 아바타 파일 찾기
    const matchingAvatarPath = Object.keys(avatarModules).find(p => p.includes(`${filename}.webp`));

    if (matchingAvatarPath) {
        // 기존 코드에서는 CharacterID (ex. 'Neve', 'Aria') 를 키 형태로 활용하곤 했음.
        // 호환성을 위해 ID를 Key로 맵핑합시다.
        avatarMap[data.characterID] = avatarModules[matchingAvatarPath];
    }
}

export const SLOT_COLORS = ['#1890ff', '#ff7a45', '#52c41a', '#b37feb', '#ff7ec8'];
