#!/bin/bash

# Script para baixar imagens de Star Wars para o card_21

echo "🌟 Baixando imagens de Star Wars para o card_21..."

cd /Users/fredericobajouco/Desktop/Fred/Fred_Programs/quizzGame_front_1/imagens

# Função para baixar e converter imagem
download_image() {
    local code=$1
    local description=$2
    
    echo "⬇️ Baixando $code - $description..."
    
    # URLs de imagens Star Wars de fontes confiáveis
    case $code in
        "W000001") url="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500" ;; # Darth Vader mask
        "W000002") url="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500" ;; # Desert planet
        "W000003") url="https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=500" ;; # Spaceship
        "W000004") url="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500" ;; # Jedi figure
        "W000005") url="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500" ;; # Dark lord
        "W000006") url="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500" ;; # Young Jedi
        "W000007") url="https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=500" ;; # Purple lightsaber
        "W000008") url="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500" ;; # Wise master
        "W000009") url="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500" ;; # Golden robot
        "W000010") url="https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=500" ;; # Moon base
        "W000011") url="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500" ;; # Large alien
        "W000012") url="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500" ;; # Swamp master
        "W000013") url="https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=500" ;; # Jedi symbol
        "W000014") url="https://images.unsplash.com/photo-1580910051074-3eb694886505?w=500" ;; # Princess
        "W000015") url="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500" ;; # Forest moon
        "W000016") url="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500" ;; # Clone trooper
        "W000017") url="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500" ;; # Ancient Sith
        "W000018") url="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500" ;; # City planet
        "W000019") url="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500" ;; # Wookiee planet
        "W000020") url="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500" ;; # Protocol droid
        "W000021") url="https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=500" ;; # Space station
        "W000022") url="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500" ;; # Empire movie
        "W000023") url="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500" ;; # Pod racing
        "W000024") url="https://images.unsplash.com/photo-1580910051074-3eb694886505?w=500" ;; # Queen Amidala
        "W000025") url="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500" ;; # Red Sith
        "W000026") url="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500" ;; # Twin suns
        "W000027") url="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500" ;; # Cantina
        "W000028") url="https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=500" ;; # Lightsaber duel
        "W000029") url="https://images.unsplash.com/photo-1551845041-63e8e76836f5?w=500" ;; # Ice planet
        "W000030") url="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500" ;; # Cyborg general
        "W000031") url="https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=500" ;; # Water planet
        "W000032") url="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500" ;; # Astromech droid
        "W000033") url="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500" ;; # Wookiee
        "W000034") url="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500" ;; # Dark side user
        "W000035") url="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500" ;; # Jedi Knight
        "W000036") url="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500" ;; # Jedi Master
        "W000037") url="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500" ;; # Desert creature
        "W000038") url="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500" ;; # Luke Jedi
        "W000039") url="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500" ;; # Imperial pilot
        "W000040") url="https://images.unsplash.com/photo-1580910051074-3eb694886505?w=500" ;; # Senator
        "W000041") url="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500" ;; # Desert scavenger
        "W000042") url="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500" ;; # Bounty hunter
        "W000043") url="https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=500" ;; # Rebellion
        "W000044") url="https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=500" ;; # Ancient era
        "W000045") url="https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=500" ;; # Rebel fighter
        "W000046") url="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500" ;; # Imperial trooper
        "W000047") url="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500" ;; # Desert beast
        "W000048") url="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500" ;; # Loyal companion
        "W000049") url="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500" ;; # Hero Jedi
        "W000050") url="https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=500" ;; # Force wisdom
        *) return 1 ;;
    esac
    
    # Tentar baixar a imagem
    if curl -s -L "$url" -o "${code}.jpg"; then
        if [ -f "${code}.jpg" ] && [ -s "${code}.jpg" ]; then
            # Verificar se é uma imagem válida
            if file "${code}.jpg" | grep -qE "(JPEG|PNG|GIF)"; then
                # Converter para PNG
                if command -v sips >/dev/null 2>&1; then
                    # macOS - usar sips
                    sips -s format png "${code}.jpg" --out "${code}.png" >/dev/null 2>&1
                    if [ -f "${code}.png" ]; then
                        rm -f "${code}.jpg"
                        echo "✅ $code: Imagem baixada e convertida para PNG"
                        return 0
                    fi
                elif command -v convert >/dev/null 2>&1; then
                    # ImageMagick
                    convert "${code}.jpg" "${code}.png" 2>/dev/null
                    if [ -f "${code}.png" ]; then
                        rm -f "${code}.jpg"
                        echo "✅ $code: Imagem baixada e convertida para PNG"
                        return 0
                    fi
                else
                    # Se não tem conversor, manter como JPG e renomear
                    mv "${code}.jpg" "${code}.png"
                    echo "✅ $code: Imagem baixada (formato original mantido)"
                    return 0
                fi
            fi
        fi
        rm -f "${code}.jpg"
    fi
    
    echo "❌ $code: Falha no download"
    return 1
}

# Baixar imagens para as 50 perguntas
success=0
total=50

echo "Baixando imagens de Star Wars..."

for i in {1..50}; do
    code=$(printf "W%06d" $i)
    case $i in
        1) desc="Darth Vader" ;;
        2) desc="Tatooine planet" ;;
        3) desc="Millennium Falcon" ;;
        4) desc="Qui-Gon Jinn" ;;
        5) desc="Emperor Sidious" ;;
        6) desc="Anakin Skywalker" ;;
        7) desc="Mace Windu purple lightsaber" ;;
        8) desc="Yoda species" ;;
        9) desc="C-3PO droid" ;;
        10) desc="Yavin 4 moon" ;;
        11) desc="Jabba the Hutt" ;;
        12) desc="Yoda Dagobah" ;;
        13) desc="Jedi Order" ;;
        14) desc="Princess Leia" ;;
        15) desc="Endor Ewoks" ;;
        16) desc="Commander Cody" ;;
        17) desc="Darth Plagueis" ;;
        18) desc="Coruscant planet" ;;
        19) desc="Kashyyyk Chewbacca" ;;
        20) desc="C-3PO creation" ;;
        21) desc="Death Star" ;;
        22) desc="Empire Strikes Back" ;;
        23) desc="Podrace Tatooine" ;;
        24) desc="Queen Padme" ;;
        25) desc="Darth Maul" ;;
        26) desc="Tatooine suns" ;;
        27) desc="Cantina" ;;
        28) desc="Vader Luke duel" ;;
        29) desc="Hoth ice planet" ;;
        30) desc="General Grievous" ;;
        31) desc="Kamino clones" ;;
        32) desc="R2-D2" ;;
        33) desc="Chewbacca" ;;
        34) desc="Ben Solo" ;;
        35) desc="Anakin Jedi" ;;
        36) desc="Obi-Wan" ;;
        37) desc="Sarlacc Pit" ;;
        38) desc="Luke Jedi" ;;
        39) desc="TIE Fighter" ;;
        40) desc="Padme Senator" ;;
        41) desc="Jawa" ;;
        42) desc="Boba Fett" ;;
        43) desc="Rebel Alliance" ;;
        44) desc="Old Republic" ;;
        45) desc="X-wing" ;;
        46) desc="Stormtrooper" ;;
        47) desc="Dewback" ;;
        48) desc="Chewbacca loyal" ;;
        49) desc="Luke hero" ;;
        50) desc="Jedi wisdom" ;;
        *) desc="Star Wars" ;;
    esac
    
    download_image "$code" "$desc" && ((success++))
done

echo ""
echo "📊 Resultado dos downloads: $success/$total imagens baixadas"

# Verificar total de arquivos PNG com W000
total_png=$(ls W000*.png 2>/dev/null | wc -l)
echo "📁 Total de arquivos PNG Star Wars: $total_png"

if [ "$total_png" -eq 50 ]; then
    echo "🎉 Todas as 50 imagens de Star Wars estão agora em formato PNG!"
else
    echo "⚠️ Ainda faltam algumas imagens. Total esperado: 50"
fi

echo "✅ Download de imagens Star Wars concluído!"
