import svgwrite
import argparse

def create_hud_snapshot(region, event, severity, timestamp, output_path):
    dwg = svgwrite.Drawing(output_path, profile='tiny', size=(400, 100))

    # Background
    colors = {
        'critical': '#d9534f',
        'warning': '#f0ad4e',
        'info': '#5bc0de',
    }
    bg_color = colors.get(severity.lower(), '#777')
    dwg.add(dwg.rect(insert=(0, 0), size=('100%', '100%'), fill=bg_color))

    # Text
    dwg.add(dwg.text(f"Region: {region}", insert=(10, 20), fill='white', font_size='16px'))
    dwg.add(dwg.text(f"Event: {event}", insert=(10, 50), fill='white', font_size='16px'))
    dwg.add(dwg.text(f"Severity: {severity}", insert=(10, 80), fill='white', font_size='16px'))
    dwg.add(dwg.text(timestamp, insert=(250, 80), fill='white', font_size='12px'))

    dwg.save()

def create_avatar_hud(avatar, action, region, output_path):
    dwg = svgwrite.Drawing(output_path, profile='tiny', size=(400, 100))

    # Background
    dwg.add(dwg.rect(insert=(0, 0), size=('100%', '100%'), fill='#444'))

    # Text
    dwg.add(dwg.text(f"Avatar: {avatar}", insert=(10, 20), fill='white', font_size='16px'))
    dwg.add(dwg.text(f"Action: {action}", insert=(10, 50), fill='white', font_size='16px'))
    dwg.add(dwg.text(f"Region: {region}", insert=(10, 80), fill='white', font_size='16px'))

    # Placeholder for motion path
    dwg.add(dwg.circle(center=(300, 50), r=20, stroke='cyan', fill='none'))

    dwg.save()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate HUD snapshot SVG.')
    subparsers = parser.add_subparsers(dest='mode', required=True)

    # HUD mode
    parser_hud = subparsers.add_parser('hud')
    parser_hud.add_argument('--region', required=True)
    parser_hud.add_argument('--event', required=True)
    parser_hud.add_argument('--severity', required=True)
    parser_hud.add_argument('--timestamp', required=True)
    parser_hud.add_argument('--output-path', required=True)

    # Avatar mode
    parser_avatar = subparsers.add_parser('avatar')
    parser_avatar.add_argument('--avatar', required=True)
    parser_avatar.add_argument('--action', required=True)
    parser_avatar.add_argument('--region', required=True)
    parser_avatar.add_argument('--output-path', required=True)

    args = parser.parse_args()

    if args.mode == 'hud':
        create_hud_snapshot(args.region, args.event, args.severity, args.timestamp, args.output_path)
    elif args.mode == 'avatar':
        create_avatar_hud(args.avatar, args.action, args.region, args.output_path)
